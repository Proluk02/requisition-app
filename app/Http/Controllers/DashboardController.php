<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\Demande;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            $usersCount = User::count();
            $projectsCount = Project::count();
            $sitesCount = Site::count();
            $requisitionsCount = Requisition::count();

            return Inertia::render('Admin/Dashboard', [
                'stats' => [
                    'usersCount' => $usersCount,
                    'projectsCount' => $projectsCount,
                    'sitesCount' => $sitesCount,
                    'requisitionsCount' => $requisitionsCount,
                    'securityStatus' => '100% Conforme',
                ],
            ]);
        }

        if ($user->hasRole('project_manager')) {
            return $this->renderProjectManagerDashboard($user);
        }

        if ($user->hasRole('director')) {
            return $this->renderDirectorDashboard($request);
        }

        if ($user->hasRole('finance')) {
            return $this->renderFinanceDashboard($user);
        }

        if ($user->hasRole('admin_manager')) {
            return $this->renderAdminManagerDashboard($user);
        }

        if ($user->hasRole('cashier')) {
            return redirect()->route('cashier.dashboard');
        }

        if ($user->hasRole('coordinator') || $user->hasRole('beneficiary')) {
            $requisitions = Requisition::with(['demandes.justificatifs', 'signatures.user'])
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get();

            return Inertia::render('Staff/Dashboard', [
                'stats' => $this->buildStats($requisitions),
                'requisitions' => $this->buildRequisitionList($requisitions),
            ]);
        }

        return Inertia::render('Dashboard');
    }

    public function directorDashboard(Request $request)
    {
        abort_unless(
            $request->user()?->canApproveAsDirector(),
            403,
            'Accès réservé exclusivement à la Direction Générale ou à l’intérim officiel.'
        );

        return $this->renderDirectorDashboard($request);
    }

    private function renderProjectManagerDashboard(User $user)
    {
        $requisitionsQuery = clone Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->where('project_id', $user->project_id)
            ->orderByDesc('created_at');

        if ($user->project_id === null) {
            $requisitionsQuery->whereRaw('1 = 0');
        }

        $requisitions = $requisitionsQuery->get();

        $budgetLines = clone BudgetLine::query()
            ->where('project_id', $user->project_id)
            ->get(['id', 'project_id', 'code', 'libelle', 'solde', 'devise', 'budget_initial'])
            ->keyBy(fn (BudgetLine $line) => BudgetLine::normalizeCode($line->code));

        $budgetTotalUSD = (float) $budgetLines->where('devise', 'USD')->sum('budget_initial');
        $budgetSoldeUSD = (float) $budgetLines->where('devise', 'USD')->sum('solde');
        $budgetConsommeUSD = max(0, $budgetTotalUSD - $budgetSoldeUSD);

        $budgetTotalFC = (float) $budgetLines->whereIn('devise', ['FC', 'CDF'])->sum('budget_initial');
        $budgetSoldeFC = (float) $budgetLines->whereIn('devise', ['FC', 'CDF'])->sum('solde');
        $budgetConsommeFC = max(0, $budgetTotalFC - $budgetSoldeFC);

        $pmStats = [
            'budget_total_usd' => $budgetTotalUSD,
            'budget_solde_usd' => $budgetSoldeUSD,
            'budget_consomme_usd' => $budgetConsommeUSD,
            'budget_total_fc' => $budgetTotalFC,
            'budget_solde_fc' => $budgetSoldeFC,
            'budget_consomme_fc' => $budgetConsommeFC,
            'req_en_attente' => $requisitions->whereIn('status', ['draft', 'returned_to_project_manager'])->count(),
            'req_validees' => $requisitions->whereNotIn('status', ['draft', 'returned_to_project_manager', 'rejetee', 'returned_to_beneficiary', 'returned_to_urgent_initiator'])->count(),
            'req_a_corriger' => $requisitions->whereIn('status', ['returned_to_project_manager'])->count(),
        ];

        $projectUsers = User::where('project_id', $user->project_id)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('ProjectManager/Dashboard', [
            'requisitions' => $this->buildProjectManagerRequisitionList($requisitions, $user->id, $budgetLines),
            'budgetLines' => $budgetLines->values()->map(fn (BudgetLine $line) => [
                'id' => $line->id,
                'project_id' => $line->project_id,
                'code' => $line->code,
                'libelle' => $line->libelle,
                'normalizedCode' => BudgetLine::normalizeCode($line->code),
                'solde' => (float) $line->solde,
                'devise' => $line->devise,
                'budget_initial' => (float) $line->budget_initial,
            ])->all(),
            'cashRegisters' => CashRegister::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'devise']),
            'pmStats' => $pmStats,
            'projectUsers' => $projectUsers,
        ]);
    }

    private function renderDirectorDashboard(Request $request)
    {
        $user = $request->user();
        $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;

        $selectedPeriod = $request->input('period', now()->format('Y-m'));
        [$year, $month] = explode('-', $selectedPeriod);

        $query = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->whereYear('created_at', (int) $year)
            ->whereMonth('created_at', (int) $month)
            ->orderByDesc('created_at');

        $allPeriodRequisitions = $query->get();

        $projectsStats = Project::all()->map(function ($p) use ($allPeriodRequisitions) {
            $projReqs = $allPeriodRequisitions->filter(fn ($r) => $r->project_id === $p->id || $r->projet === $p->name);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'count' => $projReqs->count(),
                'total_usd' => (float) $projReqs->where('devise', 'USD')->sum('montant_total'),
                'total_fc' => (float) $projReqs->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
            ];
        });

        $caissesStats = CashRegister::all()->map(function ($caisse) use ($allPeriodRequisitions) {
            $caisseReqs = $allPeriodRequisitions->filter(fn ($r) => $r->caisse_decaissement === $caisse->name);

            return [
                'caisse' => $caisse->name,
                'count' => $caisseReqs->count(),
                'total_usd' => (float) $caisseReqs->where('devise', 'USD')->sum('montant_total'),
                'decaisse_usd' => (float) $caisseReqs->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
            ];
        });

        $decaisseesCount = $allPeriodRequisitions->where('status', 'decaisse')->count();
        $nonDecaisseesCount = $allPeriodRequisitions->where('status', '!=', 'decaisse')->count();

        $requisitionsList = $allPeriodRequisitions->map(function (Requisition $r) {
            return [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'initiateurRole' => $r->user?->role ?? 'Staff',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                'observation' => $r->observation,
                'derniere_observation' => $r->derniere_observation,
                'is_urgent' => (bool) $r->is_urgent,
                'is_decaissee' => $r->status === 'decaisse',
                'statusCode' => $r->status,
                'workflowLevel' => $this->mapWorkflowLevel($r->status),
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'date_paiement' => $r->date_paiement?->format('d/m/Y'),
                'date_livraison' => $r->date_livraison?->format('d/m/Y'),
                'signatures' => $this->formatSignatures($r->signatures),
                'lignes' => $r->demandes->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'activite' => $d->activite,
                    'codeAllocation' => $d->code_allocation ?? $d->code_all_budget,
                    'nature' => $d->nature ?? $r->nature_requisition,
                    'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                    'unite' => $d->unite ?? '',
                    'prixUnitaire' => (float) $d->frais_unitaire,
                    'frais' => (float) $d->frais_unitaire,
                    'total' => (float) $d->total_ligne,
                    'justificatifs' => $d->justificatifs->map(fn ($j) => [
                        'id' => (string) $j->id,
                        'nom' => $j->original_name ?? $j->description,
                        'description' => $j->description,
                        'date' => $j->date?->format('d/m/Y'),
                        'montant' => (float) ($j->montant ?? 0),
                        'fileUrl' => $j->file_path ? route('requisitions.justificatif.show', ['justificatif' => $j->id]) : null,
                    ])->values()->all(),
                ])->values()->all(),
            ];
        });

        return Inertia::render('Director/Dashboard', [
            'selectedPeriod' => $selectedPeriod,
            'projectsStats' => $projectsStats,
            'caissesStats' => $caissesStats,
            'decaisseesCount' => $decaisseesCount,
            'nonDecaisseesCount' => $nonDecaisseesCount,
            'requisitions' => $requisitionsList,
            'isInterim' => $isInterim,
        ]);
    }

    public function directorProjects(Request $request)
    {
        abort_unless($request->user()?->canApproveAsDirector(), 403);

        $projects = Project::all()->map(function ($p) {
            $reqs = Requisition::where('project_id', $p->id)->orWhere('projet', $p->name)->get();

            return [
                'id' => $p->id,
                'name' => $p->name,
                'full_name' => $p->full_name,
                'count' => $reqs->count(),
                'total_usd' => (float) $reqs->where('devise', 'USD')->sum('montant_total'),
                'total_fc' => (float) $reqs->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
                'decaisse_usd' => (float) $reqs->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
                'en_attente_count' => $reqs->whereIn('status', ['draft', 'visa_mp', 'visa_pam', 'visa_admin'])->count(),
            ];
        });

        return Inertia::render('Director/ProjectsSummary', [
            'projects' => $projects,
        ]);
    }

    public function directorCaisses(Request $request)
    {
        abort_unless($request->user()?->canApproveAsDirector(), 403);

        $caisses = CashRegister::with('activeSession')->get()->map(function ($c) {
            $reqs = Requisition::where('caisse_decaissement', $c->name)->get();

            return [
                'nom' => $c->name,
                'total_dossiers' => $reqs->count(),
                'total_usd' => (float) $reqs->where('devise', 'USD')->sum('montant_total'),
                'total_fc' => (float) $reqs->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
                'decaisse_usd' => (float) $reqs->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
                'en_attente_usd' => (float) $reqs->where('status', 'decaissement_caisse')->where('devise', 'USD')->sum('montant_total'),
            ];
        });

        return Inertia::render('Director/CaissesSummary', [
            'caisses' => $caisses,
        ]);
    }

    public function directorUrgences(Request $request)
    {
        abort_unless($request->user()?->canApproveAsDirector(), 403);

        $urgences = Requisition::with(['user', 'demandes.justificatifs', 'project'])
            ->where('is_urgent', true)
            ->whereNotIn('status', ['decaisse', 'cloture', 'rejetee'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'demandeurNom' => $r->user?->name ?? 'Agent',
                'nature' => $r->nature_requisition,
                'montantTotal' => (float) $r->montant_total,
                'devise' => $r->devise,
                'status' => $r->status,
                'dateSoumission' => $r->created_at?->format('d/m/Y H:i') ?? '',
                'observation' => $r->observation,
                'derniere_observation' => $r->derniere_observation,
                'needsWaiver' => $r->status === 'urgent_direction',
                'canApprove' => $r->status === 'visa_admin',
                'statusLabel' => $this->mapWorkflowLevel($r->status)['label'],
            ]);

        return Inertia::render('Director/UrgentRequisitions', [
            'urgences' => $urgences,
        ]);
    }

    public function finance(Request $request)
    {
        abort_unless($request->user()?->hasRole('finance'), 403);

        return $this->renderFinanceDashboard($request->user());
    }

    private function renderFinanceDashboard(User $user)
    {
        $requisitions = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->orderByDesc('created_at')
            ->get();

        $allBudgetLinesModels = BudgetLine::with('project')->get();

        $budgetLinesByKey = [];
        foreach ($allBudgetLinesModels as $line) {
            $key = ($line->project_id ?? 'all').'_'.BudgetLine::normalizeCode($line->code);
            $budgetLinesByKey[$key] = $line;
            $budgetLinesByKey[BudgetLine::normalizeCode($line->code)] = $line;
        }

        $allBudgetLines = $allBudgetLinesModels->map(fn (BudgetLine $b) => [
            'id' => $b->id,
            'project_id' => $b->project_id,
            'project_name' => $b->project?->name ?? 'Général',
            'code' => $b->code,
            'libelle' => $b->libelle,
            'normalizedCode' => BudgetLine::normalizeCode($b->code),
            'solde' => (float) $b->solde,
            'devise' => $b->devise,
            'budget_initial' => (float) $b->budget_initial,
        ])->all();

        $pendingSessions = CashRegisterSession::with(['cashRegister', 'cashier'])
            ->where('status', 'en_attente_autorisation')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CashRegisterSession $s) => [
                'id' => $s->id,
                'caisse_name' => $s->cashRegister?->name,
                'caisse_devise' => $s->cashRegister?->devise,
                'cashier_name' => $s->cashier?->name,
                'solde_ouverture' => (float) $s->solde_ouverture,
                'date_session' => $s->date_session->format('d/m/Y'),
                'observation' => $s->observation_ouverture,
            ]);

        $caisses = CashRegister::with(['activeSession', 'cashiers'])->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'code' => $c->code,
            'devise' => $c->devise,
            'solde_actuel' => (float) $c->solde_actuel,
            'is_ouverte' => $c->isOuverte(),
            'cashiers_count' => $c->cashiers->count(),
            'cashiers_names' => $c->cashiers->pluck('name')->join(', '),
        ]);

        $cashRegisters = CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']);
        $projects = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        $users = User::orderBy('name')->get(['id', 'name', 'email']);

        return Inertia::render('Finance/Dashboard', [
            'projectName' => null,
            'scopeLabel' => 'Tous les projets',
            'projects' => $projects,
            'usersList' => $users,
            'caisses' => $caisses,
            'cashRegisters' => $cashRegisters,
            'allBudgetLines' => $allBudgetLines,
            'pendingSessions' => $pendingSessions,
            'requisitions' => $requisitions->map(function (Requisition $r) use ($budgetLinesByKey) {
                // SÉCURITÉ : La Finance ne peut décider QUE si le statut est STRICTEMENT 'visa_pam' !
                $canDecideFinance = $r->status === 'visa_pam';

                return [
                    'id' => (string) $r->id,
                    'numero' => $r->numero_requisition,
                    'projet' => $r->projet,
                    'project_id' => $r->project_id,
                    'user_id' => $r->user_id,
                    'initiateurNom' => $r->user?->name ?? 'Inconnu',
                    'initiateurRole' => $r->user?->role ?? 'Staff',
                    'nature' => $r->nature_requisition,
                    'devise' => $r->devise,
                    'montantTotal' => (float) $r->montant_total,
                    'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                    'observation' => $r->observation,
                    'derniere_observation' => $r->derniere_observation,
                    'is_urgent' => (bool) $r->is_urgent,
                    'statusCode' => $r->status,
                    'statusLabel' => match ($r->status) {
                        'draft' => 'En attente Visa MP',
                        'visa_mp' => 'En attente du visa PAM (Étape 2)',
                        'visa_pam' => 'À viser par les Finances',
                        'controle_finance' => 'Validée par les Finances',
                        'returned_to_project_manager' => 'Renvoyée au Chef de Projet',
                        'visa_admin' => 'Transmise à la Direction',
                        'decaissement_caisse' => 'Prête pour la Caisse',
                        'decaisse' => 'Décaissée',
                        default => ucfirst(str_replace('_', ' ', $r->status)),
                    },
                    'canDecide' => $canDecideFinance,
                    'canCorrect' => false,
                    'motifRejet' => $r->signatures->where('action', 'rejected')->last()?->commentaire,
                    'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                    'signatures' => $this->formatSignatures($r->signatures),
                    'lignes' => $r->demandes->map(function (Demande $d) use ($budgetLinesByKey, $r) {
                        $codeNorm = BudgetLine::normalizeCode($d->code_allocation ?: $d->code_all_budget);
                        $lookupKey = ($r->project_id ?? 'all').'_'.$codeNorm;
                        $lineModel = $budgetLinesByKey[$lookupKey] ?? ($budgetLinesByKey[$codeNorm] ?? null);

                        return [
                            'id' => (string) $d->id,
                            'activite' => $d->activite,
                            'codeBudget' => $d->code_all_budget,
                            'codeAllocation' => $d->code_allocation ?: $d->code_all_budget,
                            'libelleAllocation' => $d->libelle_allocation ?: $lineModel?->libelle,
                            'nature' => $d->nature ?? '',
                            'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                            'unite' => $d->unite ?? '',
                            'prixUnitaire' => (float) $d->frais_unitaire,
                            'frais' => (float) $d->frais_unitaire,
                            'total' => (float) $d->total_ligne,
                            'budget_solde_actuel' => $lineModel ? (float) $lineModel->solde : null,
                            'budget_initial' => $lineModel ? (float) $lineModel->budget_initial : null,
                            'justificatifs' => $d->justificatifs->map(fn ($j) => [
                                'id' => (string) $j->id,
                                'nom' => $j->original_name ?? $j->description,
                                'fileUrl' => $j->file_path ? route('requisitions.justificatif.show', ['justificatif' => $j->id]) : null,
                            ])->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ]);
    }

    public function adminManager(Request $request)
    {
        abort_unless($request->user()?->hasRole('admin_manager'), 403);

        return $this->renderAdminManagerDashboard($request->user());
    }

    private function renderAdminManagerDashboard(User $user)
    {
        $allRequisitions = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->orderByDesc('created_at')
            ->get();

        // Le PAM examine STRICTEMENT les réquisitions au statut 'visa_mp'
        $requisitions = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
            ->where(function ($query) use ($user) {
                $query->where('status', 'visa_mp')
                    ->orWhere(function ($urgentQuery) use ($user) {
                        $urgentQuery->where('status', 'returned_to_urgent_initiator')
                            ->where('user_id', $user->id);
                    });
            })
            ->orderByDesc('created_at')
            ->get();

        $adminStats = [
            'en_attente_visa' => $allRequisitions->where('status', 'visa_mp')->count(),
            'urgences_count' => $allRequisitions->where('is_urgent', true)->whereNotIn('status', ['decaisse', 'cloture', 'rejetee'])->count(),
            'total_dossiers' => $allRequisitions->count(),
            'validees_count' => $allRequisitions->whereIn('status', ['visa_pam', 'visa_admin', 'decaissement_caisse', 'decaisse', 'cloture'])->count(),
            'renvoyees_pm_count' => $allRequisitions->where('status', 'returned_to_project_manager')->count(),
            'total_usd' => (float) $allRequisitions->where('devise', 'USD')->sum('montant_total'),
            'total_fc' => (float) $allRequisitions->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
            'decaisse_usd' => (float) $allRequisitions->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
            'decaisse_fc' => (float) $allRequisitions->where('status', 'decaisse')->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
        ];

        $projectsStats = Project::all()->map(function ($p) use ($allRequisitions) {
            $projReqs = $allRequisitions->filter(fn ($r) => $r->project_id === $p->id || $r->projet === $p->name);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'full_name' => $p->full_name,
                'count' => $projReqs->count(),
                'en_attente_pam' => $projReqs->where('status', 'visa_mp')->count(),
                'total_usd' => (float) $projReqs->where('devise', 'USD')->sum('montant_total'),
                'total_fc' => (float) $projReqs->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
            ];
        });

        $caissesStats = CashRegister::with('activeSession')->get()->map(function ($c) use ($allRequisitions) {
            $caisseReqs = $allRequisitions->filter(fn ($r) => $r->caisse_decaissement === $c->name);

            return [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_ouverte' => $c->isOuverte(),
                'total_dossiers' => $caisseReqs->count(),
                'total_usd' => (float) $caisseReqs->where('devise', 'USD')->sum('montant_total'),
                'total_fc' => (float) $caisseReqs->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
                'decaisse_usd' => (float) $caisseReqs->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
            ];
        });

        $allBudgetLines = BudgetLine::with('project')->get()->map(fn (BudgetLine $b) => [
            'id' => $b->id,
            'project_id' => $b->project_id,
            'project_name' => $b->project?->name ?? 'Général',
            'code' => $b->code,
            'libelle' => $b->libelle,
            'normalizedCode' => BudgetLine::normalizeCode($b->code),
            'solde' => (float) $b->solde,
            'devise' => $b->devise,
            'budget_initial' => (float) $b->budget_initial,
        ])->all();

        return Inertia::render('AdminManager/Dashboard', [
            'isInterim' => (bool) $user->is_director_interim,
            'adminStats' => $adminStats,
            'projectsStats' => $projectsStats,
            'caissesStats' => $caissesStats,
            'projects' => Project::orderBy('name')->get(['id', 'name', 'full_name']),
            'cashRegisters' => CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']),
            'allBudgetLines' => $allBudgetLines,
            'historyRequisitions' => $allRequisitions->map(fn ($r) => [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                'statusCode' => $r->status,
                'statusLabel' => $this->mapWorkflowLevel($r->status)['label'],
                'is_urgent' => (bool) $r->is_urgent,
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'signatures' => $this->formatSignatures($r->signatures),
            ])->values()->all(),
            'requisitions' => $requisitions->map(fn ($r) => [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'user_id' => $r->user_id,
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'initiateurRole' => $r->user?->role ?? 'Staff',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                'observation' => $r->observation,
                'derniere_observation' => $r->derniere_observation,
                'is_urgent' => (bool) $r->is_urgent,
                'statusCode' => $r->status,
                'statusLabel' => match ($r->status) {
                    'returned_to_urgent_initiator' => 'Urgence à corriger par son initiateur',
                    'visa_mp' => 'Examen administratif en attente (PAM)',
                    default => 'Contrôle Administratif en attente',
                },
                'canDecide' => $r->status === 'visa_mp',
                'canCorrect' => ($r->status === 'returned_to_urgent_initiator' && (string) $r->user_id === (string) $user->id),
                'motifRejet' => $r->signatures->where('action', 'rejected')->last()?->commentaire,
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'signatures' => $this->formatSignatures($r->signatures),
                'lignes' => $r->demandes->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'activite' => $d->activite,
                    'codeBudget' => $d->code_all_budget,
                    'codeAllocation' => $d->code_allocation,
                    'nature' => $d->nature ?? '',
                    'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                    'unite' => $d->unite ?? '',
                    'prixUnitaire' => (float) $d->frais_unitaire,
                    'frais' => (float) $d->frais_unitaire,
                    'total' => (float) $d->total_ligne,
                    'justificatifs' => $d->justificatifs->map(fn ($j) => [
                        'id' => (string) $j->id,
                        'nom' => $j->original_name ?? $j->description,
                        'fileUrl' => $j->file_path ? route('requisitions.justificatif.show', ['justificatif' => $j->id]) : null,
                    ])->values()->all(),
                ])->values()->all(),
            ])->values()->all(),
        ]);
    }

    private function mapWorkflowLevel(string $status): array
    {
        return match ($status) {
            'draft' => ['step' => 1, 'label' => 'En attente du Manager de Projet', 'color' => 'gray'],
            'returned_to_beneficiary', 'returned_to_urgent_initiator' => ['step' => 1, 'label' => 'À corriger par l’initiateur', 'color' => 'red'],
            'returned_to_project_manager' => ['step' => 2, 'label' => 'À arbitrer par le Manager de Projet', 'color' => 'red'],
            'urgent_direction' => ['step' => 1, 'label' => 'Dérogation Urgente', 'color' => 'red'],
            'visa_mp' => ['step' => 2, 'label' => 'En attente du PAM', 'color' => 'blue'],
            'visa_pam' => ['step' => 3, 'label' => 'En attente des Finances', 'color' => 'purple'],
            'controle_finance' => ['step' => 3, 'label' => 'Contrôle Finances validé', 'color' => 'purple'],
            'returned_to_finance', 'returned_to_admin_manager' => ['step' => 3, 'label' => 'À arbitrer par le Manager de Projet', 'color' => 'red'],
            'visa_admin' => ['step' => 4, 'label' => 'En attente Bon à Payer (Direction)', 'color' => 'amber'],
            'decaissement_caisse' => ['step' => 5, 'label' => 'Approuvé (À décaisser)', 'color' => 'emerald'],
            'decaisse' => ['step' => 6, 'label' => 'Décaissé', 'color' => 'green'],
            'cloture' => ['step' => 7, 'label' => 'Clôturé', 'color' => 'black'],
            'rejetee' => ['step' => 0, 'label' => 'Rejeté', 'color' => 'red'],
            default => ['step' => 1, 'label' => ucfirst(str_replace('_', ' ', $status)), 'color' => 'gray'],
        };
    }

    private function buildStats($requisitions): array
    {
        $validees = $requisitions->filter(fn ($req) => in_array($req->status, ['decaissement_caisse', 'decaisse', 'cloture'], true));

        return [
            'enCoursCount' => $requisitions->whereIn('status', [
                'draft',
                'returned_to_beneficiary',
                'returned_to_project_manager',
                'returned_to_finance',
                'returned_to_admin_manager',
                'returned_to_urgent_initiator',
                'urgent_direction',
                'visa_mp',
                'visa_pam',
                'controle_finance',
                'visa_admin',
            ])->count(),
            'valideesPretesCount' => $validees->count(),
            'valideesPretesMontantUSD' => (float) $validees->where('devise', 'USD')->sum('montant_total'),
            'valideesPretesMontantFC' => (float) $validees->whereIn('devise', ['FC', 'CDF'])->sum('montant_total'),
            'vouchersMoisCount' => 0,
            'vouchersMoisTotalUSD' => 0,
            'justificatifsADeposerCount' => 0,
            'activiteEnSouffrance' => 'Aucune',
            'dechargeRef' => '#DCH-000',
        ];
    }

    private function buildRequisitionList($requisitions): array
    {
        return $requisitions->map(function ($r) {
            $status = $this->mapWorkflowStatus($r->status);

            return [
                'id' => $r->id,
                'code' => $r->numero_requisition,
                'motif' => $r->observation ?: 'Aucun motif',
                'derniere_observation' => $r->derniere_observation,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'is_urgent' => (bool) $r->is_urgent,
                'dateSoumission' => $r->created_at?->format('d M Y') ?? '',
                'montant' => number_format($r->montant_total, 2, '.', ' ').' '.$r->devise,
                'devise' => $r->devise,
                'articlesCount' => $r->demandes->count(),
                'motifRejet' => $r->signatures->where('action', 'rejected')->last()?->commentaire,
                'signatures' => $this->formatSignatures($r->signatures),
                'canCorrect' => $r->status === 'returned_to_beneficiary',
                'etapeWorkflow' => [
                    'nom' => $status['label'],
                    'statut' => $status['key'],
                    'validateurActuel' => $status['validator'],
                ],
            ];
        })->values()->all();
    }

    private function buildProjectManagerRequisitionList($requisitions, string $managerId, $budgetLines): array
    {
        return $requisitions->map(function ($r) use ($budgetLines) {
            $isReturnedToPm = in_array($r->status, [
                'returned_to_project_manager',
                'returned_to_finance',
                'returned_to_admin_manager',
            ], true);

            $isInitiatorCorrection = in_array($r->status, [
                'returned_to_beneficiary',
                'returned_to_urgent_initiator',
            ], true);

            $statut = match (true) {
                $isReturnedToPm => 'a_corriger',
                $isInitiatorCorrection => 'a_corriger_initiateur',
                $r->status === 'draft' => 'en_attente_mp',
                $r->status === 'rejetee' => 'rejete_mp',
                default => 'valide_mp',
            };

            return [
                'id' => (string) $r->id,
                'user_id' => $r->user_id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'project_id' => $r->project_id,
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'initiateurRole' => $r->user?->role ?? 'Staff',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'caisseSouhaitee' => $r->caisse_decaissement ?? 'Caisse principale',
                'caisseAttribuee' => $r->caisse_decaissement,
                'observation' => $r->observation,
                'derniere_observation' => $r->derniere_observation,
                'motifRejet' => $r->signatures->where('action', 'rejected')->last()?->commentaire,
                'is_urgent' => (bool) $r->is_urgent,
                'statut' => $statut,
                'statusCode' => $r->status,
                'statusLabel' => match ($r->status) {
                    'draft' => 'En attente Visa MP',
                    'returned_to_beneficiary' => 'À corriger par le bénéficiaire',
                    'returned_to_project_manager' => 'À arbitrer par le Chef de Projet',
                    'returned_to_finance' => 'À arbitrer par le Chef de Projet',
                    'returned_to_admin_manager' => 'À arbitrer par le Chef de Projet',
                    'returned_to_urgent_initiator' => 'Urgence à corriger par l’initiateur',
                    'visa_mp' => 'Transmis au PAM',
                    'visa_pam' => 'Transmis aux Finances',
                    'controle_finance' => 'Validée Finances',
                    'visa_admin' => 'Transmis à la Direction',
                    'urgent_direction' => 'Urgence en attente de la Direction',
                    'decaissement_caisse' => 'En attente de la Caisse',
                    'decaisse' => 'Décaissée',
                    'cloture' => 'Clôturée',
                    'rejetee' => 'Rejetée',
                    default => 'Validé MP',
                },
                'canDecide' => in_array($r->status, ['draft', 'returned_to_project_manager', 'returned_to_finance'], true),
                'canCorrect' => $isReturnedToPm,
                'financeReturned' => $isReturnedToPm,
                'needsCorrection' => $isReturnedToPm,
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'signatures' => $this->formatSignatures($r->signatures),
                'lignes' => $r->demandes->map(function ($d) use ($budgetLines, $r) {
                    $codeNorm = BudgetLine::normalizeCode($d->code_allocation ?: $d->code_all_budget);
                    $lineObj = $budgetLines->get($codeNorm);

                    return [
                        'id' => (string) $d->id,
                        'activite' => $d->activite,
                        'codeAllBudget' => $d->code_all_budget,
                        'code_allocation' => $d->code_allocation,
                        'libelleAllocation' => $d->libelle_allocation
                            ?: $lineObj?->libelle
                            ?: 'code non specifie',
                        'budget_solde_actuel' => $lineObj ? (float) $lineObj->solde : null,
                        'nature' => $d->nature ?? '',
                        'quantiteOuDuree' => (float) ($d->quantite ?: $d->duree ?: 0),
                        'unite' => $d->unite ?? '',
                        'frais' => (float) $d->frais_unitaire,
                        'prixUnitaire' => (float) $d->frais_unitaire,
                        'devise' => $r->devise,
                        'total' => (float) $d->total_ligne,
                        'justif' => $d->justificatifs->map(function ($j) {
                            $dateFormatted = '';
                            if (! empty($j->date)) {
                                $dateFormatted = is_string($j->date) ? $j->date : $j->date->format('Y-m-d');
                            }

                            return [
                                'id' => (string) $j->id,
                                'date' => $dateFormatted,
                                'description' => $j->description ?? $j->original_name,
                                'montant' => (float) $j->montant,
                                'scan' => $j->original_name ?? basename($j->file_path ?? 'piece.pdf'),
                                'fileUrl' => $j->file_path ? route('requisitions.justificatif.show', ['justificatif' => $j->id]) : null,
                            ];
                        })->values()->all(),
                    ];
                })->values()->all(),
            ];
        })->values()->all();
    }

    private function mapWorkflowStatus(string $status): array
    {
        return match ($status) {
            'draft' => ['key' => 'visa_mp', 'label' => 'En attente du Manager de Projet', 'validator' => 'Manager Projet'],
            'returned_to_beneficiary', 'returned_to_urgent_initiator' => ['key' => 'brouillon', 'label' => 'À corriger par l’initiateur', 'validator' => 'Initiateur'],
            'returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager' => ['key' => 'visa_mp', 'label' => 'À arbitrer par le Manager de Projet', 'validator' => 'Manager Projet'],
            'urgent_direction' => ['key' => 'approbation_direction', 'label' => 'Dérogation urgente', 'validator' => 'Directrice'],
            'visa_mp' => ['key' => 'visa_pam', 'label' => 'En attente du PAM', 'validator' => 'Manager Admin (PAM)'],
            'visa_pam' => ['key' => 'controle_finance', 'label' => 'En attente des Finances', 'validator' => 'Manager Finances'],
            'controle_finance' => ['key' => 'visa_admin', 'label' => 'Contrôle Finances validé', 'validator' => 'Manager Finances'],
            'visa_admin' => ['key' => 'approbation_direction', 'label' => 'En attente de la Directrice', 'validator' => 'Directrice Générale'],
            'approbation_direction' => ['key' => 'approbation_direction', 'label' => 'Approbation Direction', 'validator' => 'Directrice Générale'],
            'decaissement_caisse' => ['key' => 'caisse_pret', 'label' => 'Caisse (Prêt)', 'validator' => 'Caisse'],
            'decaisse' => ['key' => 'caisse_pret', 'label' => 'Décaissé', 'validator' => 'Caisse'],
            'cloture' => ['key' => 'caisse_pret', 'label' => 'Clôturé', 'validator' => 'Clôture'],
            default => ['key' => 'chef_projet', 'label' => 'Brouillon', 'validator' => 'Initiateur'],
        };
    }

    private function formatSignatures($signatures): array
    {
        return $signatures->map(fn ($s) => [
            'role' => $s->role_signataire,
            'nom' => $s->nom_signataire,
            'action' => $s->action,
            'commentaire' => $s->commentaire,
            'date' => $s->signed_at?->format('d/m/Y H:i') ?? '',
            'code' => $s->signature_code,
            'hash' => $s->signature_hash,
        ])->values()->all();
    }
}
