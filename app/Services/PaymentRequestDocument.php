<?php

namespace App\Services;

use App\Models\BudgetLine;
use App\Models\Demande;
use App\Models\Requisition;
use Barryvdh\DomPDF\Facade\Pdf;

class PaymentRequestDocument
{
    public function render(Requisition $requisition): string
    {
        $requisition->loadMissing(['demandes', 'project', 'user', 'signatures']);
        $budgetLines = BudgetLine::with('donor')
            ->where('project_id', $requisition->project_id)
            ->get()
            ->keyBy(fn (BudgetLine $line) => BudgetLine::normalizeCode($line->code));

        $initiatorPosition = match ($requisition->user?->role) {
            'project_manager' => 'Project Manager',
            'coordinator' => 'Coordinator',
            'finance' => 'Finance Manager',
            'admin_manager' => 'Administration Manager',
            default => 'Staff',
        };
        $pmSignature = $requisition->signatures
            ->where('role_signataire', 'project_manager')
            ->where('action', 'approved')
            ->first();
        $pamSignature = $requisition->signatures
            ->where('role_signataire', 'admin_manager')
            ->where('action', 'approved')
            ->first();
        $financeSignature = $requisition->signatures
            ->where('role_signataire', 'finance')
            ->where('action', 'approved')
            ->first();
        $directorSignature = $requisition->signatures
            ->where('role_signataire', 'director')
            ->where('action', 'approved')
            ->first();

        $paymentRequestItems = $requisition->demandes->map(function (Demande $demande) use ($budgetLines, $requisition) {
            $code = $demande->code_allocation ?: $demande->code_all_budget;
            $budgetLine = $budgetLines->get(BudgetLine::normalizeCode($code));

            return [
                'libelle' => $demande->activite,
                'entreprise' => $demande->entreprise ?: 'BON PASTEUR',
                'donneur' => ($demande->donneur ?: $budgetLine?->donor?->code) ?? '—',
                'projet' => $requisition->project?->name ?? $requisition->projet_code ?? '—',
                'code_allocation' => $code ?: '—',
                'type_demande' => $demande->nature ?: $requisition->nature_requisition,
                'montant' => (float) $demande->total_ligne,
            ];
        });

        return Pdf::loadView('pdf.payment-request', [
            'requisition' => $requisition,
            'paymentRequestItems' => $paymentRequestItems,
            'dateEcheance' => $requisition->date_paiement?->copy()->addDays(7),
            'initiatorPosition' => $initiatorPosition,
            'pmSignature' => $pmSignature,
            'pamSignature' => $pamSignature,
            'financeSignature' => $financeSignature,
            'directorSignature' => $directorSignature,
        ])->setPaper('a4')->output();
    }

    public function filename(Requisition $requisition): string
    {
        return 'Payment_Request_'.str_replace('/', '-', $requisition->numero_requisition).'.pdf';
    }
}
