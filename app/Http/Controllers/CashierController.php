<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
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
use Symfony\Component\HttpFoundation\StreamedResponse;

class CashierController extends Controller
{
    /**
     * Module 1 : Vue d'ensemble du guichet et gestion de la session journalière.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403, 'Accès réservé au guichet caisse.');

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = CashRegister::with('activeSession')->find($selectedCaisseId) ?? $userCaisses->first();

        $activeSession = null;
        $sessionMouvements = [];

        if ($selectedCaisse) {
            $activeSession = CashRegisterSession::where('cash_register_id', $selectedCaisse->id)
                ->whereDate('date_session', now()->toDateString())
                ->latest()
                ->first();

            if ($activeSession && $activeSession->status === 'ouverte') {
                $sessionMouvements = CashMovement::where('session_id', $activeSession->id)
                    ->orderByDesc('created_at')
                    ->limit(10)
                    ->get()
                    ->map(fn (CashMovement $m) => $this->transformMovement($m));
            }
        }

        $totalAttenteUSD = (float) Requisition::where('status', 'decaissement_caisse')->where('devise', 'USD')->sum('montant_total');
        $totalAttenteFC = (float) Requisition::where('status', 'decaissement_caisse')->where('devise', 'FC')->sum('montant_total');

        return Inertia::render('Cashier/Dashboard', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_active' => (bool) $c->is_active,
                'is_ouverte' => $c->isOuverte(),
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'code' => $selectedCaisse->code,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) $selectedCaisse->solde_actuel,
                'is_ouverte' => $selectedCaisse->isOuverte(),
            ] : null,
            'activeSession' => $activeSession ? [
                'id' => $activeSession->id,
                'status' => $activeSession->status,
                'date_session' => $activeSession->date_session->format('d/m/Y'),
                'solde_ouverture' => (float) $activeSession->solde_ouverture,
                'solde_fermeture' => $activeSession->solde_fermeture ? (float) $activeSession->solde_fermeture : null,
                'total_entrees' => (float) $activeSession->total_entrees,
                'total_sorties' => (float) $activeSession->total_sorties,
                'opened_at' => $activeSession->opened_at?->format('H:i'),
                'observation_ouverture' => $activeSession->observation_ouverture,
            ] : null,
            'sessionMouvements' => $sessionMouvements,
            'stats' => [
                'totalAttenteUSD' => $totalAttenteUSD,
                'totalAttenteFC' => $totalAttenteFC,
            ],
        ]);
    }

    /**
     * Module 2 : Bons à Décaisser (Réquisitions au statut decaissement_caisse et émission des BSC).
     */
    public function disbursements(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = CashRegister::with('activeSession')->find($selectedCaisseId) ?? $userCaisses->first();

        $queryADecaisser = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->where('status', 'decaissement_caisse')
            ->orderByDesc('updated_at');

        if ($selectedCaisse) {
            $queryADecaisser->where('caisse_decaissement', $selectedCaisse->name);
        }

        $aDecaisser = $queryADecaisser->get()->map(fn (Requisition $r) => $this->transformRequisition($r));

        $recentDisbursementsQuery = CashMovement::with(['cashRegister', 'cashier'])
            ->where('type', 'sortie')
            ->orderByDesc('created_at')
            ->limit(20);

        if ($selectedCaisse) {
            $recentDisbursementsQuery->where('cash_register_id', $selectedCaisse->id);
        }

        $recentDisbursements = $recentDisbursementsQuery->get()->map(fn (CashMovement $m) => $this->transformMovement($m));

        return Inertia::render('Cashier/Disbursements/Index', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_ouverte' => $c->isOuverte(),
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) $selectedCaisse->solde_actuel,
                'is_ouverte' => $selectedCaisse->isOuverte(),
            ] : null,
            'aDecaisser' => $aDecaisser,
            'recentDisbursements' => $recentDisbursements,
        ]);
    }

    /**
     * Module 3 : Entrées & Approvisionnements (Bons d'Entrée Caisse BEC et retours de fonds).
     */
    public function receipts(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = CashRegister::with('activeSession')->find($selectedCaisseId) ?? $userCaisses->first();

        $receiptsQuery = CashMovement::with(['cashRegister', 'cashier'])
            ->where('type', 'entree')
            ->orderByDesc('created_at')
            ->limit(30);

        if ($selectedCaisse) {
            $receiptsQuery->where('cash_register_id', $selectedCaisse->id);
        }

        $receipts = $receiptsQuery->get()->map(fn (CashMovement $m) => $this->transformMovement($m));

        return Inertia::render('Cashier/Receipts/Index', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_ouverte' => $c->isOuverte(),
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) $selectedCaisse->solde_actuel,
                'is_ouverte' => $selectedCaisse->isOuverte(),
            ] : null,
            'receipts' => $receipts,
        ]);
    }

    /**
     * Module 4 : Grand Livre de Caisse mensuel (Visualisation chronologique avec solde progressif).
     */
    public function ledger(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin') || $user->hasRole('finance'), 403);

        $userCaisses = $user->hasRole('finance') || $user->hasRole('admin')
            ? CashRegister::all()
            : $user->cashRegisters;

        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = CashRegister::find($selectedCaisseId) ?? $userCaisses->first();

        $selectedPeriod = $request->input('period', now()->format('Y-m'));
        [$year, $month] = explode('-', $selectedPeriod);

        $mouvements = collect();
        $totalEntreesMois = 0.0;
        $totalSortiesMois = 0.0;
        $soldeInitialMois = 0.0;

        if ($selectedCaisse) {
            $dateDebutMois = "{$year}-{$month}-01";

            $entreesPassees = (float) CashMovement::where('cash_register_id', $selectedCaisse->id)
                ->where('type', 'entree')
                ->whereDate('date_mouvement', '<', $dateDebutMois)
                ->sum('montant');

            $sortiesPassees = (float) CashMovement::where('cash_register_id', $selectedCaisse->id)
                ->where('type', 'sortie')
                ->whereDate('date_mouvement', '<', $dateDebutMois)
                ->sum('montant');

            $soldeInitialMois = $entreesPassees - $sortiesPassees;

            $moisMouvements = CashMovement::with('cashier')
                ->where('cash_register_id', $selectedCaisse->id)
                ->whereYear('date_mouvement', (int) $year)
                ->whereMonth('date_mouvement', (int) $month)
                ->orderBy('date_mouvement')
                ->orderBy('created_at')
                ->get();

            $soldeCourant = $soldeInitialMois;

            $mouvements = $moisMouvements->map(function (CashMovement $m) use (&$soldeCourant) {
                if ($m->isEntree()) {
                    $soldeCourant += $m->montant;
                } else {
                    $soldeCourant -= $m->montant;
                }

                $transformed = $this->transformMovement($m);
                $transformed['solde_progressif'] = round($soldeCourant, 2);
                return $transformed;
            });

            $totalEntreesMois = (float) $moisMouvements->where('type', 'entree')->sum('montant');
            $totalSortiesMois = (float) $moisMouvements->where('type', 'sortie')->sum('montant');
        }

        return Inertia::render('Cashier/Ledger/Index', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'devise' => $c->devise,
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) $selectedCaisse->solde_actuel,
            ] : null,
            'selectedPeriod' => $selectedPeriod,
            'soldeInitialMois' => round($soldeInitialMois, 2),
            'totalEntreesMois' => $totalEntreesMois,
            'totalSortiesMois' => $totalSortiesMois,
            'soldeFinMois' => round($soldeInitialMois + $totalEntreesMois - $totalSortiesMois, 2),
            'mouvements' => $mouvements,
        ]);
    }

    /**
     * Exporte le Grand Livre mensuel au format CSV / Excel avec encodage UTF-8 BOM.
     */
    public function exportLedger(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin') || $user->hasRole('finance'), 403);

        $selectedCaisseId = $request->input('caisse_id');
        $caisse = CashRegister::findOrFail($selectedCaisseId);

        $selectedPeriod = $request->input('period', now()->format('Y-m'));
        [$year, $month] = explode('-', $selectedPeriod);
        $dateDebutMois = "{$year}-{$month}-01";

        $entreesPassees = (float) CashMovement::where('cash_register_id', $caisse->id)
            ->where('type', 'entree')
            ->whereDate('date_mouvement', '<', $dateDebutMois)
            ->sum('montant');

        $sortiesPassees = (float) CashMovement::where('cash_register_id', $caisse->id)
            ->where('type', 'sortie')
            ->whereDate('date_mouvement', '<', $dateDebutMois)
            ->sum('montant');

        $soldeInitialMois = $entreesPassees - $sortiesPassees;

        $movements = CashMovement::with('cashier')
            ->where('cash_register_id', $caisse->id)
            ->whereYear('date_mouvement', (int) $year)
            ->whereMonth('date_mouvement', (int) $month)
            ->orderBy('date_mouvement')
            ->orderBy('created_at')
            ->get();

        $fileName = 'grand_livre_' . Str::slug($caisse->name) . "_{$year}_{$month}.csv";

        return response()->streamDownload(function () use ($caisse, $year, $month, $soldeInitialMois, $movements) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['ASBL BON PASTEUR - GRAND LIVRE DE CAISSE MENSUEL'], ';');
            fputcsv($handle, ['Caisse :', $caisse->name, 'Devise :', $caisse->devise], ';');
            fputcsv($handle, ['Période :', "{$month}/{$year}"], ';');
            fputcsv($handle, ['Solde initial au 1er du mois :', number_format($soldeInitialMois, 2, ',', ' ')], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, [
                'Date',
                'N° Pièce',
                'Type',
                'Tiers / Bénéficiaire',
                'Imputation',
                'Motif / Libellé',
                'Mode Règlement',
                'Entrée (+)',
                'Sortie (-)',
                'Solde Progressif',
                'Caissier',
            ], ';');

            $solde = $soldeInitialMois;
            foreach ($movements as $m) {
                if ($m->isEntree()) {
                    $solde += $m->montant;
                    $entree = number_format($m->montant, 2, ',', ' ');
                    $sortie = '';
                } else {
                    $solde -= $m->montant;
                    $entree = '';
                    $sortie = number_format($m->montant, 2, ',', ' ');
                }

                fputcsv($handle, [
                    $m->date_mouvement->format('d/m/Y'),
                    $m->numero_piece,
                    $m->isEntree() ? 'Entrée (BEC)' : 'Sortie (BSC)',
                    $m->tiers_nom,
                    $m->imputation,
                    $m->motif,
                    $m->mode_paiement,
                    $entree,
                    $sortie,
                    number_format($solde, 2, ',', ' '),
                    $m->cashier?->name,
                ], ';');
            }

            fputcsv($handle, [], ';');
            fputcsv($handle, ['Solde final de clôture :', number_format($solde, 2, ',', ' ')], ';');

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Valide le décaissement, émet le Bon de Sortie Caisse (BSC) et impacte automatiquement la ligne budgétaire.
     */
    public function disburse(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);
        abort_unless($requisition->status === 'decaissement_caisse', 403, 'Réquisition non autorisée au décaissement.');

        $cashRegister = CashRegister::query()
            ->where('name', $requisition->caisse_decaissement)
            ->where('is_active', true)
            ->first();

        if (! $cashRegister) {
            return Redirect::back()->with(
                'error',
                "Impossible de décaisser : la caisse « {$requisition->caisse_decaissement} » n'existe pas ou est inactive."
            );
        }

        $session = $cashRegister->activeSession;
        if (! $session || $session->status !== 'ouverte') {
            return Redirect::back()->with('error', "Impossible de décaisser : le guichet « {$requisition->caisse_decaissement} » n'est pas ouvert aujourd'hui.");
        }

        $validated = $request->validate([
            'mode_paiement' => ['required', 'string', 'in:Espèces,Chèque,Virement bancaire,Airtel Money,M-Pesa,Orange Money'],
            'reference_paiement' => ['nullable', 'string', 'max:255'],
            'montant_en_lettres' => ['required', 'string', 'max:500'],
            'observation' => ['nullable', 'string', 'max:1000'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Le code PIN caissier est strictement obligatoire.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN caissier incorrect ou non configuré.']);
        }

        DB::transaction(function () use ($validated, $requisition, $user, $cashRegister, $session) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            $now = now();
            $annee = $now->year;
            $countBSC = CashMovement::whereYear('created_at', $annee)->where('type', 'sortie')->count() + 1;
            $numeroBSC = sprintf('BSC-%s-%03d', $annee, $countBSC);

            $primaryImputation = $lockedRequisition->demandes()->first()?->code_allocation
                ?? $lockedRequisition->demandes()->first()?->code_all_budget
                ?? '6.112.a';

            $montantDecaisse = (float) $lockedRequisition->montant_total;
            $observation = preg_replace(
                '/(?:^|\R)Motif rejet (?:MP|Finance|Administratif|Direction(?: \(P\.O\. Intérim\)| \(Urgence\))?):[^\r\n]*/u',
                '',
                $lockedRequisition->observation ?? ''
            );

            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'session_id' => $session->id,
                'cashier_id' => $user->id,
                'requisition_id' => $lockedRequisition->id,
                'type' => 'sortie',
                'numero_piece' => $numeroBSC,
                'date_mouvement' => $now->toDateString(),
                'tiers_nom' => $lockedRequisition->user?->name ?? 'Demandeur',
                'montant' => $montantDecaisse,
                'devise' => $lockedRequisition->devise,
                'montant_en_lettres' => trim($validated['montant_en_lettres']),
                'motif' => 'En règlement de : ' . (trim($observation ?? '') ?: $lockedRequisition->nature_requisition),
                'imputation' => $primaryImputation,
                'mode_paiement' => $validated['mode_paiement'],
                'reference_externe' => $validated['reference_paiement'] ?? $lockedRequisition->numero_requisition,
                'signature_tiers' => $lockedRequisition->user?->name,
                'signature_caissier' => $user->name,
            ]);

            foreach ($lockedRequisition->demandes as $demande) {
                $codeAllocation = trim((string) ($demande->code_allocation ?: $demande->code_all_budget));
                $ligneTotal = (float) $demande->total_ligne;

                if (! empty($codeAllocation)) {
                    $budgetLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                        ->where('code', $codeAllocation)
                        ->lockForUpdate()
                        ->first();

                    if ($budgetLine) {
                        $budgetLine->decrement('montant_engage', min((float) $budgetLine->montant_engage, $ligneTotal));
                        $budgetLine->increment('montant_decaisse', $ligneTotal);
                        $budgetLine->update([
                            'solde' => round($budgetLine->budget_initial - $budgetLine->montant_decaisse, 2),
                        ]);
                    }
                }
            }

            $lockedRequisition->update([
                'status' => 'decaisse',
                'cashier_id' => $user->id,
                'mode_paiement' => $validated['mode_paiement'],
                'reference_paiement' => $numeroBSC,
                'date_decaissement' => $now,
            ]);

            $cashRegister->decrement('solde_actuel', $montantDecaisse);
            $session->increment('total_sorties', $montantDecaisse);

            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: 'cashier',
                action: 'disbursed',
                commentaire: "Bon de Sortie Caisse {$numeroBSC} émis. Paiement effectué en {$validated['mode_paiement']}."
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Bon de Sortie Caisse émis',
                message: "Les fonds pour votre réquisition {$lockedRequisition->numero_requisition} ont été décaissés sous le Bon de Sortie Caisse N° {$numeroBSC}."
            );
        });

        return Redirect::back()->with('success', "Bon de Sortie Caisse émis et ligne budgétaire débitée avec succès.");
    }

    protected function getUserCaisses(User $user)
    {
        return $user->hasRole('admin')
            ? CashRegister::where('is_active', true)->orderBy('name')->get()
            : $user->cashRegisters()->where('is_active', true)->orderBy('name')->get();
    }

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
            'lignes' => $r->demandes->map(fn (Demande $d) => [
                'id' => (string) $d->id,
                'activite' => $d->activite,
                'codeAllocation' => $d->code_allocation ?? $d->code_all_budget,
                'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                'unite' => $d->unite ?? '',
                'prixUnitaire' => (float) $d->frais_unitaire,
                'total' => (float) $d->total_ligne,
            ])->values()->all(),
        ];
    }

    protected function transformMovement(CashMovement $m): array
    {
        return [
            'id' => (string) $m->id,
            'type' => $m->type,
            'numero_piece' => $m->numero_piece,
            'date_mouvement' => $m->date_mouvement->format('d/m/Y'),
            'tiers_nom' => $m->tiers_nom,
            'montant' => (float) $m->montant,
            'devise' => $m->devise,
            'montant_en_lettres' => $m->montant_en_lettres,
            'motif' => $m->motif,
            'imputation' => $m->imputation,
            'mode_paiement' => $m->mode_paiement,
            'reference_externe' => $m->reference_externe,
            'caisse_nom' => $m->cashRegister?->name,
            'cashier_nom' => $m->cashier?->name,
        ];
    }

    protected function enregistrerSignature(
        Requisition $requisition,
        User $user,
        string $roleSignataire,
        string $action,
        ?string $commentaire = null
    ): void {
        $now = now();
        $hash = hash('sha256', $requisition->id . $user->id . $roleSignataire . $action . $now->toIso8601String() . config('app.key'));
        $signatureCode = sprintf('BP-SIG-CS-%s-%s-%s', strtoupper(substr($user->name, 0, 2)), $now->format('ymd'), strtoupper(substr($hash, 0, 4)));

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