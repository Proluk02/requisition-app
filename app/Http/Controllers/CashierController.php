<?php

namespace App\Http\Controllers;

use App\Models\Demande;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CashierController extends Controller
{
    /**
     * Affiche le tableau de bord du guichet caisse avec les réquisitions prêtes pour décaissement.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403, 'Accès réservé au service de caisse.');

        $selectedCaisse = $request->input('caisse', 'all');

        $queryADecaisser = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->where('status', 'decaissement_caisse')
            ->orderByDesc('updated_at');

        if ($selectedCaisse !== 'all') {
            $queryADecaisser->where('caisse_decaissement', $selectedCaisse);
        }

        $aDecaisser = $queryADecaisser->get()->map(fn (Requisition $r) => $this->transformRequisition($r));

        $queryHistorique = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project', 'cashier'])
            ->where('status', 'decaisse')
            ->orderByDesc('date_decaissement')
            ->limit(50);

        if ($selectedCaisse !== 'all') {
            $queryHistorique->where('caisse_decaissement', $selectedCaisse);
        }

        $historique = $queryHistorique->get()->map(fn (Requisition $r) => $this->transformRequisition($r));

        $totalAttenteUSD = (float) Requisition::where('status', 'decaissement_caisse')->where('devise', 'USD')->sum('montant_total');
        $totalAttenteFC = (float) Requisition::where('status', 'decaissement_caisse')->where('devise', 'FC')->sum('montant_total');
        $totalDecaisseMoisUSD = (float) Requisition::where('status', 'decaisse')
            ->where('devise', 'USD')
            ->whereMonth('date_decaissement', now()->month)
            ->whereYear('date_decaissement', now()->year)
            ->sum('montant_total');
        $totalDecaisseMoisFC = (float) Requisition::where('status', 'decaisse')
            ->where('devise', 'FC')
            ->whereMonth('date_decaissement', now()->month)
            ->whereYear('date_decaissement', now()->year)
            ->sum('montant_total');

        $caissesList = ['Caisse principale', 'EU', 'Saint Jean Eudes', 'Local Fund 1 (Boulangerie)', 'Local Fund 2'];

        return Inertia::render('Cashier/Dashboard', [
            'selectedCaisse' => $selectedCaisse,
            'caissesList' => $caissesList,
            'aDecaisser' => $aDecaisser,
            'historique' => $historique,
            'stats' => [
                'countAttente' => $aDecaisser->count(),
                'totalAttenteUSD' => $totalAttenteUSD,
                'totalAttenteFC' => $totalAttenteFC,
                'totalDecaisseMoisUSD' => $totalDecaisseMoisUSD,
                'totalDecaisseMoisFC' => $totalDecaisseMoisFC,
            ],
        ]);
    }

    /**
     * Valide le décaissement effectif et la remise des fonds avec code PIN obligatoire du caissier.
     */
    public function disburse(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403, 'Action réservée au caissier.');
        abort_unless($requisition->status === 'decaissement_caisse', 403, 'Cette réquisition n’est pas en attente de décaissement.');

        $validated = $request->validate([
            'mode_paiement' => ['required', 'string', 'in:Espèces,Chèque,Virement bancaire,Airtel Money,M-Pesa,Orange Money'],
            'reference_paiement' => ['nullable', 'string', 'max:255'],
            'observation' => ['nullable', 'string', 'max:1000'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'mode_paiement.required' => 'Veuillez sélectionner le mode de décaissement.',
            'pin.required' => 'Le code PIN caissier est strictement obligatoire pour confirmer la sortie de fonds.',
            'pin.digits_between' => 'Le code PIN doit comporter obligatoirement entre 4 et 6 chiffres.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors([
                'pin' => 'Code PIN caissier incorrect ou non configuré dans votre profil.',
            ]);
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            $now = now();
            $refPaiement = $validated['reference_paiement'] ?? 'CASH-' . $now->format('ymd-His');

            $lockedRequisition->update([
                'status' => 'decaisse',
                'cashier_id' => $user->id,
                'mode_paiement' => $validated['mode_paiement'],
                'reference_paiement' => $refPaiement,
                'date_decaissement' => $now,
            ]);

            $commentaire = sprintf(
                'Fonds décaissés au guichet par %s. Mode : %s | Réf : %s',
                $user->name,
                $validated['mode_paiement'],
                $refPaiement
            );

            if (! empty($validated['observation'])) {
                $commentaire .= ' | Note : ' . trim($validated['observation']);
            }

            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: 'cashier',
                action: 'disbursed',
                commentaire: $commentaire
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Fonds décaissés au guichet',
                message: "Les fonds pour votre réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) ont été remis au guichet. Mode: {$validated['mode_paiement']} (Réf: {$refPaiement})."
            );

            $this->notifierRole(
                roleCible: 'finance',
                projectId: null,
                titre: 'Sortie de caisse confirmée',
                message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) a été décaissée par {$user->name} au guichet {$lockedRequisition->caisse_decaissement}."
            );
        });

        return Redirect::back()->with('success', "Décaissement confirmé avec succès pour le dossier {$requisition->numero_requisition}.");
    }

    /**
     * Formate une réquisition pour transmission uniforme à Inertia.
     */
    protected function transformRequisition(Requisition $r): array
    {
        return [
            'id' => (string) $r->id,
            'numero' => $r->numero_requisition,
            'projet' => $r->projet,
            'initiateurNom' => $r->user?->name ?? 'Agent',
            'initiateurRole' => $r->user?->role ?? 'Staff',
            'nature' => $r->nature_requisition,
            'devise' => $r->devise,
            'montantTotal' => (float) $r->montant_total,
            'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
            'observation' => $r->observation,
            'is_urgent' => (bool) $r->is_urgent,
            'status' => $r->status,
            'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
            'mode_paiement' => $r->mode_paiement,
            'reference_paiement' => $r->reference_paiement,
            'date_decaissement' => $r->date_decaissement?->format('d/m/Y à H:i'),
            'cashierNom' => $r->cashier?->name,
            'signatures' => $r->signatures->map(fn (RequisitionSignature $s) => [
                'role' => $s->role_signataire,
                'nom' => $s->nom_signataire,
                'action' => $s->action,
                'date' => $s->signed_at->format('d/m/Y H:i'),
                'code' => $s->signature_code,
                'hash' => $s->signature_hash,
            ])->values()->all(),
            'lignes' => $r->demandes->map(fn (Demande $d) => [
                'id' => (string) $d->id,
                'activite' => $d->activite,
                'codeAllocation' => $d->code_allocation ?? $d->code_all_budget,
                'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                'unite' => $d->unite ?? '',
                'prixUnitaire' => (float) $d->frais_unitaire,
                'total' => (float) $d->total_ligne,
                'justificatifs' => $d->justificatifs->map(fn ($j) => [
                    'id' => (string) $j->id,
                    'nom' => $j->original_name ?? $j->description,
                    'fileUrl' => $j->file_path ? route('requisitions.justificatif.show', ['justificatif' => $j->id]) : null,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }

    /**
     * Enregistre le visa électronique du caissier dans la table d'audit SHA-256.
     */
    protected function enregistrerSignature(
        Requisition $requisition,
        User $user,
        string $roleSignataire,
        string $action,
        ?string $commentaire = null
    ): void {
        $now = now();
        $hash = hash('sha256', $requisition->id . $user->id . $roleSignataire . $action . $now->toIso8601String() . config('app.key'));
        $userInitials = strtoupper(substr($user->name, 0, 2));
        $signatureCode = sprintf('BP-SIG-CS-%s-%s-%s', $userInitials, $now->format('ymd'), strtoupper(substr($hash, 0, 4)));

        RequisitionSignature::create([
            'requisition_id' => $requisition->id,
            'user_id' => $user->id,
            'role_signataire' => $roleSignataire,
            'nom_signataire' => $user->name,
            'action' => $action,
            'commentaire' => $commentaire,
            'signature_code' => $signatureCode,
            'signature_hash' => $hash,
            'signed_at' => $now,
        ]);
    }

    /**
     * Notifie les utilisateurs par rôle dans la table MySQL native.
     */
    protected function notifierRole(string $roleCible, ?string $projectId, string $titre, string $message): void
    {
        $users = User::role($roleCible)->get();
        foreach ($users as $u) {
            $this->notifierUtilisateur($u->id, $titre, $message);
        }
    }

    /**
     * Insère une notification non lue en base de données MySQL.
     */
    protected function notifierUtilisateur(string $userId, string $titre, string $message): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\RequisitionWorkflowNotification',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $userId,
            'data' => json_encode([
                'titre' => $titre,
                'message' => $message,
                'urgent' => false,
                'date' => now()->format('d/m/Y H:i'),
            ]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}