<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashRegister;
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
            $projectName = $user->project?->name;
            $requisitionsQuery = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user', 'project'])
                ->orderByDesc('created_at');

            if ($user->project_id === null && ! $projectName) {
                $requisitionsQuery->whereRaw('1 = 0');
            } else {
                $requisitionsQuery->where(function ($query) use ($user, $projectName) {
                    if ($user->project_id !== null) {
                        $query->where('project_id', $user->project_id);
                    }
                    if ($projectName) {
                        $query->orWhere('projet', $projectName);
                    }
                });
            }

            // Chargement garanti des lignes budgétaires (projet du manager ou ensemble des lignes actives)
            $projectId = $user->project_id ?? $user->project?->id;
            $budgetLinesQuery = BudgetLine::query();
            if ($projectId) {
                $budgetLinesQuery->where('project_id', $projectId);
            }

            $budgetLines = $budgetLinesQuery->orderBy('code')->get()->map(fn (BudgetLine $b) => [
                'id' => $b->id,
                'project_id' => $b->project_id,
                'code' => $b->code,
                'libelle' => $b->libelle,
                'devise' => $b->devise,
                'solde' => (float) $b->solde,
                'budget_initial' => (float) $b->budget_initial,
            ]);

            $cashRegisters = CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']);

            return Inertia::render('ProjectManager/Dashboard', [
                'requisitions' => $this->buildProjectManagerRequisitionList($requisitionsQuery->get(), (string) $user->id),
                'projectBudgetLines' => $budgetLines,
                'cashRegisters' => $cashRegisters,
            ]);
        }

        if ($user->hasRole('director') || ($user->canApproveAsDirector() && ! $user->hasRole('admin_manager') && ! $user->hasRole('finance'))) {
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
                'total_fc' => (float) $projReqs->where('devise', 'FC')->sum('montant_total'),
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
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'initiateurRole' => $r->user?->role ?? 'Staff',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                'observation' => $r->observation,
                'is_urgent' => (bool) $r->is_urgent,
                'is_decaissee' => $r->status === 'decaisse',
                'statusCode' => $r->status,
                'workflowLevel' => $this->mapWorkflowLevel($r->status),
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'signatures' => $r->signatures->map(fn ($s) => [
                    'role' => $s->role_signataire,
                    'nom' => $s->nom_signataire,
                    'action' => $s->action,
                    'date' => $s->signed_at?->format('d/m/Y H:i'),
                    'code' => $s->signature_code,
                    'hash' => $s->signature_hash,
                ])->values()->all(),
                'lignes' => $r->demandes->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'activite' => $d->activite,
                    'codeAllocation' => $d->code_allocation ?? $d->code_all_budget,
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
                'total_fc' => (float) $reqs->where('devise', 'FC')->sum('montant_total'),
                'decaisse_usd' => (float) $reqs->where('status', 'decaisse')->where('devise', 'USD')->sum('montant_total'),
                'en_attente_count' => $reqs->whereIn('status', ['draft', 'visa_mp', 'controle_finance', 'visa_admin'])->count(),
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
                'total_fc' => (float) $reqs->where('devise', 'FC')->sum('montant_total'),
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
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'demandeurNom' => $r->user?->name ?? 'Agent',
                'nature' => $r->nature_requisition,
                'montantTotal' => (float) $r->montant_total,
                'devise' => $r->devise,
                'status' => $r->status,
                'dateSoumission' => $r->created_at?->format('d/m/Y H:i') ?? '',
                'observation' => $r->observation,
                'needsWaiver' => $r->status === 'urgent_direction',
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

        $budgetLines = BudgetLine::all()->keyBy(fn ($b) => $b->project_id . '_' . $b->code);

        $allBudgetLines = BudgetLine::orderBy('code')->get()->map(fn (BudgetLine $b) => [
            'id' => $b->id,
            'project_id' => $b->project_id,
            'code' => $b->code,
            'libelle' => $b->libelle,
            'devise' => $b->devise,
            'solde' => (float) $b->solde,
            'budget_initial' => (float) $b->budget_initial,
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

        $projects = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        $users = User::orderBy('name')->get(['id', 'name', 'email']);

        return Inertia::render('Finance/Dashboard', [
            'projectName' => null,
            'scopeLabel' => 'Tous les projets',
            'projects' => $projects,
            'usersList' => $users,
            'caisses' => $caisses,
            'allBudgetLines' => $allBudgetLines,
            'requisitions' => $requisitions->map(function (Requisition $r) use ($budgetLines) {
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
                    'observation' => $r->observation,
                    'caisseAttribuee' => $r->caisse_decaissement ?? 'Caisse principale',
                    'is_urgent' => (bool) $r->is_urgent,
                    'statusCode' => $r->status,
                    'statusLabel' => ucfirst($r->status),
                    'canDecide' => $r->status === 'visa_mp',
                    'financeRejected' => $r->status === 'returned_to_project_manager',
                    'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                    'lignes' => $r->demandes->map(function (Demande $d) use ($r, $budgetLines) {
                        $codeAlloc = trim((string) ($d->code_allocation ?: $d->code_all_budget));
                        $budgetKey = $r->project_id . '_' . $codeAlloc;
                        $lineModel = $budgetLines->get($budgetKey);

                        return [
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
            })->all(),
        ]);
    }

    public function adminManager(Request $request)
    {
        abort_unless($request->user()?->hasRole('admin_manager'), 403);
        return $this->renderAdminManagerDashboard($request->user());
    }

    private function renderAdminManagerDashboard(User $user)
    {
        $requisitions = Requisition::with(['user', 'demandes.justificatifs', 'signatures.user'])
            ->where('status', 'controle_finance')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('AdminManager/Dashboard', [
            'isInterim' => (bool) $user->is_director_interim,
            'requisitions' => $requisitions->map(fn ($r) => [
                'id' => (string) $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'initiateurNom' => $r->user?->name ?? 'Inconnu',
                'initiateurRole' => $r->user?->role ?? 'Staff',
                'nature' => $r->nature_requisition,
                'devise' => $r->devise,
                'montantTotal' => (float) $r->montant_total,
                'observation' => $r->observation,
                'is_urgent' => (bool) $r->is_urgent,
                'statusCode' => $r->status,
                'statusLabel' => 'Contrôle Administratif',
                'canDecide' => true,
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
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
            'draft' => ['step' => 1, 'label' => 'Brouillon', 'color' => 'gray'],
            'urgent_direction' => ['step' => 1, 'label' => 'Dérogation Urgente', 'color' => 'red'],
            'returned_to_beneficiary' => ['step' => 1, 'label' => 'Renvoyé au demandeur', 'color' => 'amber'],
            'visa_mp' => ['step' => 2, 'label' => 'Visa MP Accordé', 'color' => 'blue'],
            'returned_to_project_manager' => ['step' => 2, 'label' => 'Renvoyé au Chef de Projet', 'color' => 'amber'],
            'controle_finance' => ['step' => 3, 'label' => 'Contrôle Finances Validé', 'color' => 'purple'],
            'visa_admin' => ['step' => 4, 'label' => 'En attente Bon à Payer', 'color' => 'amber'],
            'approbation_direction' => ['step' => 4, 'label' => 'Approbation Direction', 'color' => 'indigo'],
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
            'enCoursCount' => $requisitions->whereIn('status', ['draft', 'visa_mp', 'controle_finance', 'visa_admin', 'approbation_direction'])->count(),
            'valideesPretesCount' => $validees->count(),
            'valideesPretesMontantUSD' => (float) $validees->where('devise', 'USD')->sum('montant_total'),
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
                'projet' => $r->projet,
                'is_urgent' => (bool) $r->is_urgent,
                'dateSoumission' => $r->created_at?->format('d M Y') ?? '',
                'montant' => number_format((float) $r->montant_total, 2, '.', ' ') . ' ' . $r->devise,
                'devise' => $r->devise,
                'articlesCount' => $r->demandes->count(),
                'etapeWorkflow' => [
                    'nom' => $status['label'],
                    'statut' => $status['key'],
                    'validateurActuel' => $status['validator'],
                ],
            ];
        })->values()->all();
    }

    private function buildProjectManagerRequisitionList($requisitions, string $managerId): array
    {
        return $requisitions->map(function ($r) use ($managerId) {
            $isFinanceReturned = $r->status === 'returned_to_project_manager';
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
                'caisseSouhaitee' => $r->caisse_decaissement ?? 'Caisse principale',
                'caisseAttribuee' => $r->caisse_decaissement,
                'observation' => $r->observation,
                'is_urgent' => (bool) $r->is_urgent,
                'statut' => $isFinanceReturned ? 'a_corriger' : (in_array($r->status, ['draft', 'returned_to_project_manager'], true) ? 'en_attente_mp' : 'valide_mp'),
                'statusCode' => $r->status,
                'statusLabel' => in_array($r->status, ['draft', 'returned_to_project_manager'], true) ? ($isFinanceReturned ? 'Renvoyé par Finance' : 'En attente Visa MP') : 'Validé MP',
                'canDecide' => in_array($r->status, ['draft', 'returned_to_project_manager'], true),
                'canEdit' => in_array($r->status, ['draft', 'returned_to_project_manager'], true),
                'financeReturned' => $isFinanceReturned,
                'needsCorrection' => $isFinanceReturned || in_array($r->status, ['returned_to_beneficiary', 'rejetee'], true),
                'dateSoumission' => $r->created_at?->format('d/m/Y') ?? '',
                'lignes' => $r->demandes->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'activite' => $d->activite,
                    'codeAllBudget' => $d->code_all_budget,
                    'code_allocation' => $d->code_allocation,
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
                ])->values()->all(),
            ];
        })->values()->all();
    }

    private function mapWorkflowStatus(string $status): array
    {
        return match ($status) {
            'draft' => ['key' => 'chef_projet', 'label' => 'Brouillon', 'validator' => 'Initiateur'],
            'urgent_direction' => ['key' => 'urgent', 'label' => 'Dérogation Urgente', 'validator' => 'Directrice'],
            'returned_to_beneficiary' => ['key' => 'chef_projet', 'label' => 'Renvoyé au demandeur', 'validator' => 'Initiateur'],
            'returned_to_project_manager' => ['key' => 'chef_projet', 'label' => 'Renvoyé au Chef de Projet', 'validator' => 'Manager Projet'],
            'visa_mp' => ['key' => 'chef_projet', 'label' => 'Visa Chef Projet', 'validator' => 'Manager Projet'],
            'controle_finance' => ['key' => 'finance_budget', 'label' => 'Contrôle Finances', 'validator' => 'Manager Finances'],
            'visa_admin' => ['key' => 'finance_budget', 'label' => 'Administration', 'validator' => 'Manager Admin'],
            'approbation_direction' => ['key' => 'finance_budget', 'label' => 'Approbation Direction', 'validator' => 'Directrice Générale'],
            'decaissement_caisse' => ['key' => 'caisse_pret', 'label' => 'Caisse (Prêt)', 'validator' => 'Caisse'],
            'decaisse' => ['key' => 'caisse_pret', 'label' => 'Décaissé', 'validator' => 'Caisse'],
            'cloture' => ['key' => 'caisse_pret', 'label' => 'Clôturé', 'validator' => 'Clôture'],
            'rejetee' => ['key' => 'rejetee', 'label' => 'Rejetée', 'validator' => 'Fin de cycle'],
            default => ['key' => 'chef_projet', 'label' => ucfirst(str_replace('_', ' ', $status)), 'validator' => 'Initiateur'],
        };
    }
}