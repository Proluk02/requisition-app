<?php

namespace App\Http\Controllers;

use App\Models\PettyCashVoucher;
use App\Models\Requisition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class PettyCashController extends Controller
{

    public function index(Request $request)
    {
        $user = $request->user();

        $requisitionsQuery = Requisition::with(['demandes', 'user'])
            ->when($user->hasRole('project_manager'), function ($q) use ($user) {
                $q->where('project_id', $user->project_id);
            })
            ->when($user->hasRole('beneficiary') || $user->hasRole('coordinator'), function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->latest();

        $requisitions = $requisitionsQuery->get()->map(function ($r) {
            return [
                'id' => $r->id,
                'code' => $r->numero_requisition,
                'projet' => $r->projet,
                'nature' => $r->nature_requisition,
                'montantTotal' => (float) $r->montant_total,
                'devise' => $r->devise,
                'status' => $r->status,
                'demandeurNom' => $r->user?->name ?? 'Agent',
            ];
        });

        $vouchersQuery = PettyCashVoucher::with(['requisition', 'user'])
            ->when($user->hasRole('project_manager'), function ($q) use ($user) {
                $q->whereHas('requisition', fn ($req) => $req->where('project_id', $user->project_id));
            })
            ->when($user->hasRole('beneficiary') || $user->hasRole('coordinator'), function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->latest();

        $vouchers = $vouchersQuery->get()->map(function ($v) {
            return [
                'id' => $v->id,
                'requisition_id' => $v->requisition_id,
                'requisition_code' => $v->requisition?->numero_requisition ?? '—',
                'numero_voucher' => $v->numero_voucher,
                'company_name' => $v->company_name,
                'date_voucher' => $v->date_voucher?->format('Y-m-d') ?? now()->toDateString(),
                'account_code' => $v->account_code ?? 'A/C-01',
                'description' => $v->description,
                'montant_cdf' => (float) $v->montant_cdf,
                'montant_usd' => (float) $v->montant_usd,
                'montant_en_lettres' => $v->montant_en_lettres,
                'checked_by' => $v->checked_by,
                'checked_at' => $v->checked_at?->format('d/m/Y H:i'),
                'authorized_by' => $v->authorized_by,
                'recipient_signature' => $v->recipient_signature,
                'status' => $v->status,
            ];
        });

        return Inertia::render('Staff/Transport/Index', [
            'requisitions' => $requisitions,
            'vouchers' => $vouchers,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'requisition_id' => ['required', 'exists:requisitions,id'],
            'date_voucher' => ['required', 'date'],
            'account_code' => ['nullable', 'string', 'max:50'],
            'description' => ['required', 'string', 'max:500'],
            'devise' => ['required', 'in:USD,FC'],
            'montant' => ['required', 'numeric', 'min:1'],
            'montant_en_lettres' => ['required', 'string'],
        ]);

        $requisition = Requisition::findOrFail($validated['requisition_id']);

        $montant = (float) $validated['montant'];
        if ($validated['devise'] === 'USD' && $montant > 20.00) {
            return Redirect::back()->withErrors([
                'montant' => 'Règle de conformité dépassée : un Petit Cash ne peut excéder 20 USD.',
            ]);
        }

        if ($validated['devise'] === 'FC' && $montant > 30000.00) {
            return Redirect::back()->withErrors([
                'montant' => 'Règle de conformité dépassée : un Petit Cash ne peut excéder 30 000 FC.',
            ]);
        }

        $count = PettyCashVoucher::whereYear('created_at', now()->year)->count() + 1;
        $numeroVoucher = sprintf('PCV-%s-%03d', now()->format('Y'), $count);

        $montantCDF = $validated['devise'] === 'FC' ? $montant : 0;
        $montantUSD = $validated['devise'] === 'USD' ? $montant : 0;

        PettyCashVoucher::create([
            'requisition_id' => $requisition->id,
            'user_id' => $user->id,
            'numero_voucher' => $numeroVoucher,
            'company_name' => 'ASBL BON PASTEUR',
            'date_voucher' => $validated['date_voucher'],
            'account_code' => $validated['account_code'] ?? 'A/C-DEP',
            'description' => $validated['description'],
            'montant_cdf' => $montantCDF,
            'montant_usd' => $montantUSD,
            'montant_en_lettres' => $validated['montant_en_lettres'],
            'recipient_signature' => $user->name,
            'recipient_signed_at' => now(),
            'checked_by' => $user->hasRole('project_manager') ? $user->name : null,
            'checked_at' => $user->hasRole('project_manager') ? now() : null,
            'status' => $user->hasRole('project_manager') ? 'valide_mp' : 'en_attente',
        ]);

        return Redirect::back()->with('success', "Petit Cash {$numeroVoucher} enregistré en base de données.");
    }

    public function visaMP(Request $request, PettyCashVoucher $voucher)
    {
        $user = $request->user();
        abort_unless($user->hasRole('project_manager'), 403, 'Action réservée au Manager de Projet.');

        $voucher->update([
            'checked_by' => $user->name,
            'checked_at' => now(),
            'status' => 'valide_mp',
        ]);

        return Redirect::back()->with('success', "Visa accordé par le Manager de Projet sur le voucher {$voucher->numero_voucher}.");
    }
}