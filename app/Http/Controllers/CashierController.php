<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\DailyExchangeRate;
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
     * Module 1 : Vue d'ensemble du guichet.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403, 'Accès réservé au guichet caisse.');

        $userCaisses = $this->getUserCaisses($user);

        $caissesData = $userCaisses->map(function ($caisse) {
            $activeSession = CashRegisterSession::where('cash_register_id', $caisse->id)
                ->whereIn('status', ['ouverte', 'en_attente_autorisation'])
                ->latest()
                ->first();

            $sessionMouvements = [];
            if ($activeSession && $activeSession->status === 'ouverte') {
                $sessionMouvements = CashMovement::where('session_id', $activeSession->id)
                    ->orderByDesc('created_at')
                    ->limit(10)
                    ->get()
                    ->map(fn (CashMovement $m) => $this->transformMovement($m));
            }

            $lastClosed = CashRegisterSession::where('cash_register_id', $caisse->id)
                ->where('status', 'fermee')
                ->latest('date_session')
                ->first();

            $openingPreview = null;
            if ($lastClosed && $lastClosed->solde_fermeture !== null) {
                $openingPreview = [
                    'type' => 'report_veille',
                    'solde' => (float) $lastClosed->solde_fermeture,
                    'date_source' => $lastClosed->date_session ? $lastClosed->date_session->format('d/m/Y') : null,
                    'is_blocked' => false,
                ];
            } else {
                $soldeInitial = (float) ($caisse->solde_actuel ?? 0.0);
                $openingPreview = [
                    'type' => 'solde_initial',
                    'solde' => $soldeInitial,
                    'date_source' => null,
                    'is_blocked' => false,
                ];
            }

            $pendingCount = Requisition::where('status', 'decaissement_caisse')
                ->whereRaw('LOWER(TRIM(caisse_decaissement)) = ?', [strtolower(trim($caisse->name))])
                ->count();

            return [
                'id' => $caisse->id,
                'name' => $caisse->name,
                'code' => $caisse->code,
                'devise' => $caisse->devise,
                'solde_actuel' => (float) ($caisse->solde_actuel ?? 0.0),
                'is_active' => (bool) $caisse->is_active,
                'is_ouverte' => $caisse->isOuverte(),
                'is_approvisionnee' => (bool) $caisse->is_approvisionnee,
                'pending_count' => $pendingCount,
                'activeSession' => $activeSession ? [
                    'id' => $activeSession->id,
                    'status' => $activeSession->status,
                    'date_session' => $activeSession->date_session ? $activeSession->date_session->format('d/m/Y') : '',
                    'solde_ouverture' => (float) ($activeSession->solde_ouverture ?? 0.0),
                    'total_entrees' => (float) ($activeSession->total_entrees ?? 0.0),
                    'total_sorties' => (float) ($activeSession->total_sorties ?? 0.0),
                    'opened_at' => $activeSession->opened_at ? $activeSession->opened_at->format('H:i') : null,
                    'observation_ouverture' => $activeSession->observation_ouverture,
                ] : null,
                'openingPreview' => $openingPreview,
                'sessionMouvements' => $sessionMouvements,
            ];
        });

        $caisseNames = $userCaisses->pluck('name')->map(fn ($n) => strtolower(trim($n)))->all();

        $totalAttenteUSD = (float) Requisition::where('status', 'decaissement_caisse')
            ->where('devise', 'USD')
            ->whereIn(DB::raw('LOWER(TRIM(caisse_decaissement))'), $caisseNames)
            ->sum('montant_total');

        $totalAttenteFC = (float) Requisition::where('status', 'decaissement_caisse')
            ->whereIn('devise', ['FC', 'CDF'])
            ->whereIn(DB::raw('LOWER(TRIM(caisse_decaissement))'), $caisseNames)
            ->sum('montant_total');

        $totalAttenteEUR = (float) Requisition::where('status', 'decaissement_caisse')
            ->where('devise', 'EUR')
            ->whereIn(DB::raw('LOWER(TRIM(caisse_decaissement))'), $caisseNames)
            ->sum('montant_total');

        return Inertia::render('Cashier/Dashboard', [
            'caisses' => $caissesData,
            'stats' => [
                'totalAttenteUSD' => $totalAttenteUSD,
                'totalAttenteFC' => $totalAttenteFC,
                'totalAttenteEUR' => $totalAttenteEUR,
            ],
        ]);
    }

    /**
     * Module 2 : Bons à Décaisser (avec chargement des splits de ventilation).
     */
    public function disbursements(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = $userCaisses->firstWhere('id', $selectedCaisseId) ?? $userCaisses->first();

        $aDecaisser = collect();

        if ($selectedCaisse) {
            $aDecaisser = Requisition::with(['user', 'demandes.splits', 'demandes.justificatifs', 'project'])
                ->where('status', 'decaissement_caisse')
                ->whereRaw('LOWER(TRIM(caisse_decaissement)) = ?', [strtolower(trim($selectedCaisse->name))])
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (Requisition $r) => [
                    'id' => (string) $r->id,
                    'numero' => $r->numero_requisition,
                    'projet' => $r->projet,
                    'initiateurNom' => $r->user?->name ?? 'Agent',
                    'initiateurRole' => $r->user?->role ?? 'Staff',
                    'nature' => $r->nature_requisition,
                    'devise' => $r->devise,
                    'montantTotal' => (float) $r->montant_total,
                    'montantTotalEur' => (float) ($r->montant_total_eur ?? 0.0),
                    'caisseAttribuee' => $r->caisse_decaissement ?? $selectedCaisse->name,
                    'observation' => $r->observation,
                    'is_urgent' => (bool) $r->is_urgent,
                    'dateSoumission' => $r->created_at ? $r->created_at->format('d/m/Y') : '',
                    'lignes' => $r->demandes->map(fn ($d) => [
                        'id' => (string) $d->id,
                        'activite' => $d->activite,
                        'codeAllocation' => $d->code_allocation ?? $d->code_all_budget,
                        'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                        'unite' => $d->unite ?? '',
                        'prixUnitaire' => (float) $d->frais_unitaire,
                        'total' => (float) $d->total_ligne,
                        'splits' => $d->splits->map(fn ($s) => [
                            'id' => $s->id,
                            'code_allocation' => $s->code_allocation,
                            'libelle_allocation' => $s->libelle_allocation,
                            'montant' => (float) $s->montant,
                        ])->all(),
                    ])->values()->all(),
                ]);
        }

        $recentDisbursementsQuery = CashMovement::with(['cashRegister', 'cashier'])
            ->where('type', 'sortie')
            ->orderByDesc('created_at')
            ->limit(20);

        if ($selectedCaisse) {
            $recentDisbursementsQuery->where('cash_register_id', $selectedCaisse->id);
        }

        $recentDisbursements = $recentDisbursementsQuery->get()->map(fn (CashMovement $m) => $this->transformMovement($m));

        $caissesOptions = $userCaisses->map(function ($c) {
            $count = Requisition::where('status', 'decaissement_caisse')
                ->whereRaw('LOWER(TRIM(caisse_decaissement)) = ?', [strtolower(trim($c->name))])
                ->count();

            return [
                'id' => $c->id,
                'name' => $c->name,
                'devise' => $c->devise,
                'solde_actuel' => (float) ($c->solde_actuel ?? 0.0),
                'is_ouverte' => $c->isOuverte(),
                'pending_count' => $count,
            ];
        });

        return Inertia::render('Cashier/Disbursements/Index', [
            'userCaisses' => $caissesOptions,
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) ($selectedCaisse->solde_actuel ?? 0.0),
                'is_ouverte' => $selectedCaisse->isOuverte(),
            ] : null,
            'aDecaisser' => $aDecaisser,
            'recentDisbursements' => $recentDisbursements,
        ]);
    }

    /**
     * DÉCAISSEMENT EFFECTIF AVEC DÉDUCTION VENTILÉE GLOBALE (SPLITS) :
     */
    public function disburse(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);
        abort_unless($requisition->status === 'decaissement_caisse', 403, 'Réquisition non autorisée au décaissement.');

        $cashRegister = CashRegister::query()
            ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($requisition->caisse_decaissement))])
            ->where('is_active', true)
            ->first();

        if (! $cashRegister) {
            return Redirect::back()->with(
                'error',
                "Impossible de décaisser : la caisse « {$requisition->caisse_decaissement} » est introuvable ou inactive."
            );
        }

        if (! $user->hasRole('admin')) {
            $isAssigned = $cashRegister->cashiers()->where('users.id', $user->id)->exists();
            abort_unless($isAssigned, 403, "Action refusée : Vous n'êtes pas affecté à la caisse « {$requisition->caisse_decaissement} ».");
        }

        $session = $cashRegister->activeSession;
        if (! $session || $session->status !== 'ouverte') {
            return Redirect::back()->with('error', "Impossible de décaisser : le guichet « {$requisition->caisse_decaissement} » n'est pas ouvert aujourd'hui.");
        }

        $montantDecaisse = (float) $requisition->montant_total;
        $soldeDisponible = (float) ($cashRegister->solde_actuel ?? 0.0);

        if ($soldeDisponible <= 0.0) {
            return Redirect::back()->with(
                'error',
                "Décaissement strictement impossible : Le solde de la caisse est de 0,00 {$cashRegister->devise}. Veuillez approvisionner la caisse via un Bon d'Entrée (BEC) avant toute dépense."
            );
        }

        if ($soldeDisponible < $montantDecaisse) {
            return Redirect::back()->with(
                'error',
                'Décaissement impossible : Fonds insuffisants en caisse. '.
                'Solde disponible : '.number_format($soldeDisponible, 2, ',', ' ')." {$cashRegister->devise}. ".
                'Montant requis : '.number_format($montantDecaisse, 2, ',', ' ')." {$cashRegister->devise}."
            );
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

        DB::transaction(function () use ($validated, $requisition, $user, $cashRegister, $session, $montantDecaisse) {
            // Eager load des demandes ET de leurs splits pour avoir toutes les informations.
            $lockedRequisition = Requisition::with('demandes.splits')->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            $now = now();
            $annee = $now->year;
            $countBSC = CashMovement::whereYear('created_at', $annee)->where('type', 'sortie')->count() + 1;
            $numeroBSC = sprintf('BSC-%s-%03d', $annee, $countBSC);

            $activeRate = DailyExchangeRate::getActiveRate();
            $conversionTotal = DailyExchangeRate::convertToEur($montantDecaisse, $lockedRequisition->devise, $activeRate);
            $totalRequisitionEur = $conversionTotal['montant_eur'];

            // 1. AGRÉGATION DES DÉDUCTIONS BUDGÉTAIRES PAR CODE (Prévient les écrasements si le même code est ventilé plusieurs fois)
            $deductionsParCode = [];
            $originalCodes = [];

            foreach ($lockedRequisition->demandes as $demande) {
                $splits = $demande->splits;

                if ($splits->isNotEmpty()) {
                    foreach ($splits as $split) {
                        $conversionSplit = DailyExchangeRate::convertToEur((float) $split->montant, $lockedRequisition->devise, $activeRate);
                        $codeNorm = BudgetLine::normalizeCode($split->code_allocation);
                        
                        if (!isset($deductionsParCode[$codeNorm])) {
                            $deductionsParCode[$codeNorm] = 0.0;
                        }
                        $deductionsParCode[$codeNorm] += $conversionSplit['montant_eur'];
                        $originalCodes[] = trim($split->code_allocation);
                    }
                } else {
                    $codeAllocation = trim((string) ($demande->code_allocation ?: $demande->code_all_budget));
                    if (! empty($codeAllocation)) {
                        $conversionLigne = DailyExchangeRate::convertToEur((float) $demande->total_ligne, $lockedRequisition->devise, $activeRate);
                        $codeNorm = BudgetLine::normalizeCode($codeAllocation);
                        
                        if (!isset($deductionsParCode[$codeNorm])) {
                            $deductionsParCode[$codeNorm] = 0.0;
                        }
                        $deductionsParCode[$codeNorm] += $conversionLigne['montant_eur'];
                        $originalCodes[] = $codeAllocation;
                    }
                }
            }

            // Générer l'étiquette d'imputation globale (pour le BSC PDF)
            $originalCodes = array_values(array_unique(array_filter($originalCodes)));
            $primaryImputation = count($originalCodes) > 1 
                ? 'MULTI-CODES (' . implode(', ', array_slice($originalCodes, 0, 3)) . (count($originalCodes) > 3 ? '...' : '') . ')' 
                : ($originalCodes[0] ?? 'NON DEFINI');

            $observation = preg_replace(
                '/(?:^|\R)Motif rejet (?:MP|Finance|Administratif|Direction(?: \(P\.O\. Intérim\)| \(Urgence\))?):[^\r\n]*/u',
                '',
                $lockedRequisition->observation ?? ''
            );

            // 2. Création du Mouvement de Caisse (BSC)
            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'session_id' => $session->id,
                'cashier_id' => $user->id,
                'requisition_id' => $lockedRequisition->id,
                'type' => 'sortie',
                'status_validation' => 'valide',
                'pin_validated' => true,
                'numero_piece' => $numeroBSC,
                'date_mouvement' => $now->toDateString(),
                'tiers_nom' => $lockedRequisition->user?->name ?? 'Demandeur',
                'montant' => $montantDecaisse,
                'devise' => $cashRegister->devise,
                'montant_en_lettres' => trim($validated['montant_en_lettres']),
                'motif' => 'En règlement de : '.(trim($observation ?? '') ?: $lockedRequisition->nature_requisition),
                'imputation' => $primaryImputation,
                'mode_paiement' => $validated['mode_paiement'],
                'reference_externe' => $validated['reference_paiement'] ?? $lockedRequisition->numero_requisition,
                'signature_tiers' => $lockedRequisition->user?->name,
                'signature_caissier' => $user->name,
            ]);

            // 3. Application propre et sécurisée des déductions sur le solde de chaque Ligne Budgétaire
            foreach ($deductionsParCode as $codeNorm => $montantADeduire) {
                $budgetLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                    ->lockForUpdate()
                    ->first();

                if ($budgetLine) {
                    $nouveauDecaisse = $budgetLine->montant_decaisse + $montantADeduire;
                    $nouveauSolde = round($budgetLine->budget_initial - $nouveauDecaisse, 2);
                    
                    $budgetLine->update([
                        'montant_decaisse' => $nouveauDecaisse,
                        'solde' => $nouveauSolde,
                    ]);
                }
            }

            // 4. Clôture de la réquisition
            $lockedRequisition->update([
                'status' => 'decaisse',
                'cashier_id' => $user->id,
                'mode_paiement' => $validated['mode_paiement'],
                'reference_paiement' => $numeroBSC,
                'date_decaissement' => $now,
                'taux_eur_usd' => $conversionTotal['taux_eur_usd'],
                'taux_eur_cdf' => $conversionTotal['taux_eur_cdf'],
                'montant_total_eur' => $totalRequisitionEur,
            ]);

            $cashRegister->decrement('solde_actuel', $montantDecaisse);
            $session->increment('total_sorties', $montantDecaisse);

            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: 'cashier',
                action: 'disbursed',
                commentaire: "Bon de Sortie Caisse {$numeroBSC} émis. Paiement en {$validated['mode_paiement']}. Déduit du budget au taux journalier (Équivalent total : {$totalRequisitionEur} EUR)."
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Bon de Sortie Caisse émis',
                message: "Les fonds pour votre réquisition {$lockedRequisition->numero_requisition} ont été décaissés sous le N° {$numeroBSC}."
            );
        });

        return Redirect::back()->with('success', 'Bon de Sortie Caisse émis. Caisse débitée et consommation budgétaire imputée avec succès sur l\'ensemble des lignes et ventilations.');
    }

    /**
     * Module 3 : Entrées & Approvisionnements (BEC).
     */
    public function receipts(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = $userCaisses->firstWhere('id', $selectedCaisseId) ?? $userCaisses->first();

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
                'solde_actuel' => (float) ($c->solde_actuel ?? 0.0),
                'is_ouverte' => $c->isOuverte(),
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) ($selectedCaisse->solde_actuel ?? 0.0),
                'is_ouverte' => $selectedCaisse->isOuverte(),
                'is_approvisionnee' => (bool) $selectedCaisse->is_approvisionnee,
            ] : null,
            'receipts' => $receipts,
        ]);
    }

    /**
     * Module 4 : Grand Livre de Caisse mensuel.
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

            $derniereSessionAvant = CashRegisterSession::where('cash_register_id', $selectedCaisse->id)
                ->where('status', 'fermee')
                ->whereDate('date_session', '<', $dateDebutMois)
                ->latest('date_session')
                ->first();

            if ($derniereSessionAvant && $derniereSessionAvant->solde_fermeture !== null) {
                $fluxIntermediaires = CashMovement::where('cash_register_id', $selectedCaisse->id)
                    ->where('status_validation', 'valide')
                    ->whereDate('date_mouvement', '>', $derniereSessionAvant->date_session)
                    ->whereDate('date_mouvement', '<', $dateDebutMois)
                    ->get();

                $soldeInitialMois = (float) $derniereSessionAvant->solde_fermeture
                    + (float) $fluxIntermediaires->where('type', 'entree')->sum('montant')
                    - (float) $fluxIntermediaires->where('type', 'sortie')->sum('montant');
            } else {
                $entreesAvant = (float) CashMovement::where('cash_register_id', $selectedCaisse->id)
                    ->where('status_validation', 'valide')
                    ->whereDate('date_mouvement', '<', $dateDebutMois)
                    ->where('type', 'entree')
                    ->sum('montant');

                $sortiesAvant = (float) CashMovement::where('cash_register_id', $selectedCaisse->id)
                    ->where('status_validation', 'valide')
                    ->whereDate('date_mouvement', '<', $dateDebutMois)
                    ->where('type', 'sortie')
                    ->sum('montant');

                $soldeInitialMois = round($entreesAvant - $sortiesAvant, 2);
            }

            $moisMouvements = CashMovement::with('cashier')
                ->where('cash_register_id', $selectedCaisse->id)
                ->where('status_validation', 'valide')
                ->whereYear('date_mouvement', (int) $year)
                ->whereMonth('date_mouvement', (int) $month)
                ->orderBy('date_mouvement')
                ->orderBy('created_at')
                ->get();

            $soldeCourant = $soldeInitialMois;

            $mouvements = $moisMouvements->map(function (CashMovement $m, $index) use (&$soldeCourant) {
                if ($m->isEntree()) {
                    $soldeCourant += (float) $m->montant;
                } else {
                    $soldeCourant -= (float) $m->montant;
                }

                return [
                    'id' => (string) $m->id,
                    'numero_ligne' => $index + 2,
                    'date_mouvement' => $m->date_mouvement ? $m->date_mouvement->format('d/m/Y') : '',
                    'projet' => $m->requisition?->projet ?? '',
                    'numero_piece' => $m->numero_piece,
                    'reference_externe' => $m->reference_externe,
                    'imputation' => $m->imputation,
                    'designation' => $m->motif,
                    'entree' => $m->isEntree() ? (float) $m->montant : 0.0,
                    'sortie' => $m->isSortie() ? (float) $m->montant : 0.0,
                    'solde_progressif' => round($soldeCourant, 2),
                    'devise' => $m->devise,
                ];
            });

            $totalEntreesMois = (float) $moisMouvements->where('type', 'entree')->sum('montant');
            $totalSortiesMois = (float) $moisMouvements->where('type', 'sortie')->sum('montant');
        }

        return Inertia::render('Cashier/Ledger/Index', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'code' => $selectedCaisse->code,
                'devise' => $selectedCaisse->devise,
            ] : null,
            'selectedPeriod' => $selectedPeriod,
            'soldeInitialMois' => round($soldeInitialMois, 2),
            'totalEntreesMois' => round($totalEntreesMois, 2),
            'totalSortiesMois' => round($totalSortiesMois, 2),
            'soldeFinMois' => round($soldeInitialMois + $totalEntreesMois - $totalSortiesMois, 2),
            'mouvements' => $mouvements,
        ]);
    }

    public function exportLedger(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin') || $user->hasRole('finance'), 403);

        $selectedCaisseId = $request->input('caisse_id');
        $caisse = CashRegister::findOrFail($selectedCaisseId);

        $selectedPeriod = $request->input('period', now()->format('Y-m'));
        [$year, $month] = explode('-', $selectedPeriod);
        $dateDebutMois = "{$year}-{$month}-01";

        $derniereSessionAvant = CashRegisterSession::where('cash_register_id', $caisse->id)
            ->where('status', 'fermee')
            ->whereDate('date_session', '<', $dateDebutMois)
            ->latest('date_session')
            ->first();

        if ($derniereSessionAvant && $derniereSessionAvant->solde_fermeture !== null) {
            $fluxIntermediaires = CashMovement::where('cash_register_id', $caisse->id)
                ->where('status_validation', 'valide')
                ->whereDate('date_mouvement', '>', $derniereSessionAvant->date_session)
                ->whereDate('date_mouvement', '<', $dateDebutMois)
                ->get();

            $soldeInitialMois = (float) $derniereSessionAvant->solde_fermeture
                + (float) $fluxIntermediaires->where('type', 'entree')->sum('montant')
                - (float) $fluxIntermediaires->where('type', 'sortie')->sum('montant');
        } else {
            $entreesAvant = (float) CashMovement::where('cash_register_id', $caisse->id)
                ->where('status_validation', 'valide')
                ->whereDate('date_mouvement', '<', $dateDebutMois)
                ->where('type', 'entree')
                ->sum('montant');

            $sortiesAvant = (float) CashMovement::where('cash_register_id', $caisse->id)
                ->where('status_validation', 'valide')
                ->whereDate('date_mouvement', '<', $dateDebutMois)
                ->where('type', 'sortie')
                ->sum('montant');

            $soldeInitialMois = round($entreesAvant - $sortiesAvant, 2);
        }

        $movements = CashMovement::with('cashier')
            ->where('cash_register_id', $caisse->id)
            ->where('status_validation', 'valide')
            ->whereYear('date_mouvement', (int) $year)
            ->whereMonth('date_mouvement', (int) $month)
            ->orderBy('date_mouvement')
            ->orderBy('created_at')
            ->get();

        $fileName = 'grand_livre_'.Str::slug($caisse->name)."_{$year}_{$month}.csv";

        return response()->streamDownload(function () use ($caisse, $year, $month, $soldeInitialMois, $movements) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['Bon Pasteur A.S.B.L. - Système Centralisé des Coûts'], ';');
            fputcsv($handle, ["GRAND LIVRE CAISSE {$caisse->name} - {$month}/{$year} - Devise : {$caisse->devise}"], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, [
                'DATE', 'N°', 'PROJET', 'N°BON', 'PIECE / REF', 'IMPUTATION', 'DESIGNATION',
                "ENTREE ({$caisse->devise})", "SORTIE ({$caisse->devise})", "SOLDE ({$caisse->devise})",
            ], ';');

            fputcsv($handle, [
                "01/{$month}/{$year}", '1', '', '', '', '', "SOLDE D'OUVERTURE",
                '', '', number_format($soldeInitialMois, 2, ',', ' '),
            ], ';');

            $solde = $soldeInitialMois;
            $totIn = 0.0;
            $totOut = 0.0;

            foreach ($movements as $idx => $m) {
                if ($m->isEntree()) {
                    $solde += $m->montant;
                    $totIn += $m->montant;
                    $in = number_format($m->montant, 2, ',', ' ');
                    $out = '';
                } else {
                    $solde -= $m->montant;
                    $totOut -= $m->montant;
                    $in = '';
                    $out = number_format($m->montant, 2, ',', ' ');
                }

                fputcsv($handle, [
                    $m->date_mouvement ? $m->date_mouvement->format('d/m/Y') : '',
                    $idx + 2,
                    $m->requisition?->projet ?? '',
                    $m->numero_piece,
                    $m->reference_externe ?? '',
                    $m->imputation,
                    $m->motif,
                    $in,
                    $out,
                    number_format($solde, 2, ',', ' '),
                ], ';');
            }

            fputcsv($handle, [
                now()->endOfMonth()->format('d/m/Y'), '', '', '', '', '', 'Solde de cloture',
                '', '', number_format($solde, 2, ',', ' '),
            ], ';');

            fputcsv($handle, [
                '', '', '', '', '', '', 'TOTAL',
                number_format($totIn, 2, ',', ' '), number_format($totOut, 2, ',', ' '), '',
            ], ';');

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Module Journal Quotidien de Caisse (A4).
     */
    public function journalDuJour(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin') || $user->hasRole('finance'), 403);

        $userCaisses = $this->getUserCaisses($user);
        $selectedCaisseId = $request->input('caisse_id', $userCaisses->first()?->id ?? '');
        $selectedCaisse = $userCaisses->firstWhere('id', $selectedCaisseId) ?? $userCaisses->first();

        $selectedDate = $request->input('date', now()->toDateString());

        $session = null;
        $mouvements = [];
        $openingBalanceResolved = 0.0;
        $totalEntreesJour = 0.0;
        $totalSortiesJour = 0.0;
        $latestSessionDate = null;

        if ($selectedCaisse) {
            $session = CashRegisterSession::with(['cashier', 'authorizedBy'])
                ->where('cash_register_id', $selectedCaisse->id)
                ->whereDate('date_session', $selectedDate)
                ->first();

            $latestSession = CashRegisterSession::where('cash_register_id', $selectedCaisse->id)
                ->latest('date_session')
                ->first();
            $latestSessionDate = $latestSession?->date_session?->toDateString();

            if ($session && $session->solde_ouverture !== null) {
                $openingBalanceResolved = (float) $session->solde_ouverture;
            } else {
                $lastClosed = CashRegisterSession::where('cash_register_id', $selectedCaisse->id)
                    ->where('status', 'fermee')
                    ->whereDate('date_session', '<', $selectedDate)
                    ->latest('date_session')
                    ->first();

                if ($lastClosed && $lastClosed->solde_fermeture !== null) {
                    $openingBalanceResolved = (float) $lastClosed->solde_fermeture;
                } else {
                    $openingBalanceResolved = 0.0;
                }
            }

            $movementsQuery = CashMovement::with('cashier')
                ->where('cash_register_id', $selectedCaisse->id);

            if ($session) {
                $movementsQuery->where('session_id', $session->id);
            } else {
                $movementsQuery->whereDate('date_mouvement', $selectedDate);
            }

            $rawMouvements = $movementsQuery->orderBy('created_at')->get();

            $soldeCourant = $openingBalanceResolved;
            $mouvements = $rawMouvements->map(function (CashMovement $m) use (&$soldeCourant) {
                if ($m->isEntree()) {
                    $soldeCourant += (float) $m->montant;
                } else {
                    $soldeCourant -= (float) $m->montant;
                }

                $transformed = $this->transformMovement($m);
                $transformed['solde_progressif'] = round($soldeCourant, 2);

                return $transformed;
            });

            $totalEntreesJour = (float) $rawMouvements->where('type', 'entree')->sum('montant');
            $totalSortiesJour = (float) $rawMouvements->where('type', 'sortie')->sum('montant');
        }

        $soldeTheoriqueJour = round($openingBalanceResolved + $totalEntreesJour - $totalSortiesJour, 2);

        return Inertia::render('Cashier/JournalDuJour', [
            'userCaisses' => $userCaisses->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
                'solde_actuel' => (float) ($c->solde_actuel ?? 0.0),
            ]),
            'selectedCaisse' => $selectedCaisse ? [
                'id' => $selectedCaisse->id,
                'name' => $selectedCaisse->name,
                'code' => $selectedCaisse->code,
                'devise' => $selectedCaisse->devise,
                'solde_actuel' => (float) ($selectedCaisse->solde_actuel ?? 0.0),
            ] : null,
            'selectedDate' => $selectedDate,
            'latestSessionDate' => $latestSessionDate,
            'openingBalanceResolved' => round($openingBalanceResolved, 2),
            'totalEntreesJour' => round($totalEntreesJour, 2),
            'totalSortiesJour' => round($totalSortiesJour, 2),
            'soldeTheoriqueJour' => round($soldeTheoriqueJour, 2),
            'session' => $session ? [
                'id' => $session->id,
                'date_session' => $session->date_session ? $session->date_session->format('d/m/Y') : '',
                'cashier_nom' => $session->cashier?->name,
                'authorized_by_nom' => $session->authorizedBy?->name,
                'opened_at' => $session->opened_at ? $session->opened_at->format('H:i') : null,
                'closed_at' => $session->closed_at ? $session->closed_at->format('H:i') : null,
                'status' => $session->status,
                'origine_ouverture' => $session->origine_ouverture ?? 'report_veille',
                'solde_ouverture' => (float) ($session->solde_ouverture ?? $openingBalanceResolved),
                'total_entrees' => (float) ($session->total_entrees ?? $totalEntreesJour),
                'total_sorties' => (float) ($session->total_sorties ?? $totalSortiesJour),
                'solde_theorique' => (float) ($session->solde_theorique_cloture ?? $soldeTheoriqueJour),
                'solde_physique' => $session->solde_fermeture !== null ? (float) $session->solde_fermeture : null,
                'ecart' => $session->ecart_caisse !== null ? (float) $session->ecart_caisse : null,
                'justification_ecart' => $session->justification_ecart,
            ] : null,
            'mouvements' => $mouvements,
        ]);
    }

    protected function getUserCaisses(User $user)
    {
        return $user->hasRole('admin')
            ? CashRegister::where('is_active', true)->orderBy('name')->get()
            : $user->cashRegisters()->where('is_active', true)->orderBy('name')->get();
    }

    protected function transformMovement(CashMovement $m): array
    {
        return [
            'id' => (string) $m->id,
            'type' => $m->type,
            'is_approvisionnement' => (bool) ($m->is_approvisionnement || $m->is_approvisionnement_initial),
            'numero_piece' => $m->numero_piece,
            'date_mouvement' => $m->date_mouvement ? $m->date_mouvement->format('d/m/Y') : '',
            'tiers_nom' => $m->tiers_nom,
            'montant' => (float) $m->montant,
            'devise' => $m->devise,
            'montant_en_lettres' => $m->montant_en_lettres,
            'motif' => $m->motif,
            'imputation' => $m->imputation,
            'mode_paiement' => $m->mode_paiement,
            'reference_externe' => $m->reference_externe,
            'bordereau_banque_ref' => $m->bordereau_banque_ref,
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
        $hash = hash('sha256', $requisition->id.$user->id.$roleSignataire.$action.$now->toIso8601String().config('app.key'));
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