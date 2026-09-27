<?php

namespace App\Http\Controllers;

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
            $requisitionsQuery = Requisition::with('user', 'demandes.justificatifs')
                ->orderByDesc('created_at');

            if ($user->project_id === null) {
                $requisitionsQuery->whereRaw('1 = 0');
            } else {
                $requisitionsQuery->where('project_id', $user->project_id);
            }

            $requisitions = $requisitionsQuery->get();

            return Inertia::render('ProjectManager/Dashboard', [
                'requisitions' => $this->buildProjectManagerRequisitionList($requisitions, $user->id),
            ]);
        }

        if ($user->hasRole('finance')) {
            return $this->renderFinanceDashboard($user);
        }

        if ($user->hasRole('admin_manager')) {
            return $this->renderAdminManagerDashboard();
        }

        if ($user->hasRole('coordinator') || $user->hasRole('beneficiary')) {
            $requisitions = Requisition::with('demandes.justificatifs')
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

    public function finance(Request $request)
    {
        abort_unless($request->user()?->hasRole('finance'), 403);

        return $this->renderFinanceDashboard($request->user());
    }

    public function adminManager(Request $request)
    {
        abort_unless($request->user()?->hasRole('admin_manager'), 403);

        return $this->renderAdminManagerDashboard();
    }

    private function renderAdminManagerDashboard()
    {
        $requisitions = Requisition::with('user', 'demandes.justificatifs')
            ->where('status', 'controle_finance')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('AdminManager/Dashboard', [
            'requisitions' => $requisitions->map(function (Requisition $requisition) {
                return [
                    'id' => (string) $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'initiateurNom' => $requisition->user?->name ?? 'Inconnu',
                    'initiateurRole' => $requisition->user?->role ?? 'Staff',
                    'nature' => strtolower($requisition->nature_requisition) === 'service' ? 'Service' : 'Achat',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'observation' => $requisition->observation,
                    'statusCode' => $requisition->status,
                    'statusLabel' => 'Contrôle Administratif',
                    'canDecide' => true,
                    'dateSoumission' => $requisition->created_at?->format('d/m/Y') ?? '',
                    'lignes' => $requisition->demandes->map(function (Demande $demande) use ($requisition) {
                        return [
                            'id' => (string) $demande->id,
                            'activite' => $demande->activite,
                            'codeBudget' => $demande->code_all_budget,
                            'codeAllocation' => $demande->code_allocation,
                            'nature' => $demande->nature ?? '',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?: (($demande->duree ?? 0) > 0 ? 'Jour(s)' : 'Unité'),
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'justificatifs' => $demande->justificatifs->map(function ($justificatif) {
                                return [
                                    'id' => (string) $justificatif->id,
                                    'nom' => $justificatif->original_name ?? $justificatif->description,
                                    'description' => $justificatif->description,
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'fileUrl' => $justificatif->file_path
                                        ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id])
                                        : null,
                                ];
                            })->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ]);
    }

    
    private function renderFinanceDashboard(User $user)
    {
        $requisitions = Requisition::with('user', 'demandes.justificatifs')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Finance/Dashboard', [
            'projectName' => null,
            'scopeLabel' => 'Tous les projets',
            'requisitions' => $requisitions->map(function (Requisition $requisition) {
                $financeRejected = $requisition->status === 'draft'
                    && str_contains($requisition->observation ?? '', 'Motif rejet Finance:');

                return [
                    'id' => (string) $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'initiateurNom' => $requisition->user?->name ?? 'Inconnu',
                    'initiateurRole' => $requisition->user?->role ?? 'Staff',
                    'nature' => strtolower($requisition->nature_requisition) === 'service' ? 'Service' : 'Achat',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'observation' => $requisition->observation,
                    'statusCode' => $requisition->status,
                    'statusLabel' => $financeRejected
                        ? 'Renvoyée en correction'
                        : $this->financeStatusLabel($requisition->status),
                    'canDecide' => $requisition->status === 'visa_mp',
                    'financeRejected' => $financeRejected,
                    'dateSoumission' => $requisition->created_at?->format('d/m/Y') ?? '',
                    'lignes' => $requisition->demandes->map(function (Demande $demande) use ($requisition) {
                        return [
                            'id' => (string) $demande->id,
                            'activite' => $demande->activite,
                            'codeBudget' => $demande->code_all_budget,
                            'codeAllocation' => $demande->code_allocation,
                            'nature' => strtolower($demande->nature ?? 'achat') === 'service' ? 'Service' : 'Achat',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?: (($demande->duree ?? 0) > 0 ? 'Jour(s)' : 'Unité'),
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'justificatifs' => $demande->justificatifs->map(function ($justificatif) {
                                return [
                                    'id' => (string) $justificatif->id,
                                    'nom' => $justificatif->original_name ?? $justificatif->description,
                                    'description' => $justificatif->description,
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'fileUrl' => $justificatif->file_path
                                        ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id])
                                        : null,
                                ];
                            })->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ]);
    } 

    /*private function renderFinanceDashboard(User $user)
    {
        $requisitions = Requisition::with('user', 'demandes.justificatifs')
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('Finance/Dashboard', [
            'projectName' => null,
            'scopeLabel' => 'Tous les projets',
            'requisitions' => $requisitions->map(function (Requisition $requisition) {
                // Vérifie si la réquisition a un historique de rejet Finance dans l'observation
                $hasFinanceRejection = str_contains($requisition->observation ?? '', 'Motif rejet Finance:');
                
                // Le statut est à visa_pm (ou visa_mp selon votre convention de nommage exacte)
                $isSubmittedByPm = in_array($requisition->status, ['visa_mp'], true);

                return [
                    'id' => (string) $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'initiateurNom' => $requisition->user?->name ?? 'Inconnu',
                    'initiateurRole' => $requisition->user?->role ?? 'Staff',
                    'nature' => strtolower($requisition->nature_requisition) === 'service' ? 'Service' : 'Achat',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'observation' => $requisition->observation,
                    'statusCode' => $requisition->status,
                    'statusLabel' => ($isSubmittedByPm && $hasFinanceRejection)
                        ? 'Resoumise par le PM (Après correction)'
                        : $this->financeStatusLabel($requisition->status),
                    
                    // Le Finance Manager peut valider/rejeter dès que le statut est visa_pm (ou visa_mp)
                    'canDecide' => $isSubmittedByPm,
                    'financeRejected' => $hasFinanceRejection,
                    'dateSoumission' => $requisition->updated_at?->format('d/m/Y H:i') ?? '',
                    'lignes' => $requisition->demandes->map(function (Demande $demande) {
                        return [
                            'id' => (string) $demande->id,
                            'activite' => $demande->activite,
                            'codeBudget' => $demande->code_all_budget,
                            'codeAllocation' => $demande->code_allocation,
                            'nature' => strtolower($demande->nature ?? 'achat') === 'service' ? 'Service' : 'Achat',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?: (($demande->duree ?? 0) > 0 ? 'Jour(s)' : 'Unité'),
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'justificatifs' => $demande->justificatifs->map(function ($justificatif) {
                                return [
                                    'id' => (string) $justificatif->id,
                                    'nom' => $justificatif->original_name ?? $justificatif->description,
                                    'description' => $justificatif->description,
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'fileUrl' => $justificatif->file_path
                                        ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id])
                                        : null,
                                ];
                            })->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ]);
    }*/


    private function financeStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Brouillon',
            'visa_mp' => 'À valider par Finance',
            'controle_finance' => 'Validée par Finance',
            'rejetee_finance' => 'Rejetée par Finance',
            'visa_admin' => 'Visa Administration',
            'approbation_direction' => 'Approbation Direction',
            'decaissement_caisse' => 'En attente de décaissement',
            'cloture' => 'Clôturée',
            'rejetee', 'rejete', 'rejected' => 'Rejetée',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    private function buildStats($requisitions): array
    {
        $all = $requisitions;
        $validees = $all->filter(fn ($req) => in_array($req->status, ['decaissement_caisse', 'cloture'], true));

        $justificatifsADeposer = 0;
        $activiteEnSouffrance = 'Aucune';
        foreach ($all as $requisition) {
            foreach ($requisition->demandes as $demande) {
                $justificatifs = $demande->justificatifs()->get();

                if ($justificatifs->isEmpty()) {
                    $justificatifsADeposer++;
                    $activiteEnSouffrance = $activiteEnSouffrance === 'Aucune' ? $demande->activite : $activiteEnSouffrance;
                }
            }
        }

        return [
            'enCoursCount' => $all->count(),
            'valideesPretesCount' => $validees->count(),
            'valideesPretesMontantUSD' => (float) $validees->where('devise', 'USD')->sum('montant_total'),
            'vouchersMoisCount' => 0,
            'vouchersMoisTotalUSD' => 0,
            'justificatifsADeposerCount' => $justificatifsADeposer,
            'activiteEnSouffrance' => $activiteEnSouffrance,
            'dechargeRef' => $all->isNotEmpty() ? '#DCH-' . substr(str_replace('-', '', $all->first()->numero_requisition), -3) : '#DCH-000',
        ];
    }

    private function buildRequisitionList($requisitions): array
    {
        return $requisitions->map(function ($requisition) {
            $status = $this->mapWorkflowStatus($requisition->status);

            return [
                'id' => $requisition->id,
                'code' => $requisition->numero_requisition,
                'motif' => $requisition->observation ?: 'Aucun motif détaillé',
                'projet' => $requisition->projet,
                'dateSoumission' => $requisition->created_at?->format('d M Y') ?? '',
                'montant' => $this->formatAmount($requisition->montant_total, $requisition->devise),
                'devise' => $requisition->devise,
                'articlesCount' => $requisition->demandes->count(),
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
        return $requisitions
            ->map(function ($requisition) use ($managerId) {
                $observation = $requisition->observation ?? '';
                $rejectionPosition = max(
                    strrpos($observation, 'Motif rejet Finance:') ?: -1,
                    strrpos($observation, 'Motif rejet Administratif:') ?: -1,
                );
                $correctionPosition = strrpos($observation, 'Correction apportée par le Manager:');
                $isReturnedForCorrection = $requisition->status === 'draft' && $rejectionPosition >= 0;
                $hasCorrection = $isReturnedForCorrection
                    && $correctionPosition !== false
                    && $correctionPosition > $rejectionPosition;
                $needsCorrection = ($isReturnedForCorrection && ! $hasCorrection)
                    || in_array($requisition->status, ['rejetee', 'rejete', 'rejected'], true);
                $canEdit = $requisition->status === 'draft'
                    && ($requisition->user_id === $managerId || $isReturnedForCorrection)
                    || ($requisition->status === 'visa_mp'
                        && $requisition->user_id === $managerId
                        && $requisition->manager_edit_locked_at === null);

                return [
                    'id' => (string) $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'initiateurNom' => $requisition->user?->name ?? 'Inconnu',
                    'initiateurRole' => $requisition->user?->role ?? 'Staff',
                    'nature' => $requisition->nature_requisition === 'service' ? 'Service' : 'Achat',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'caisseSouhaitee' => $requisition->caisse_decaissement ?? 'Caisse principale',
                    'caisseAttribuee' => $requisition->status === 'draft' ? null : $requisition->caisse_decaissement,
                    'observation' => $requisition->observation ?: 'Aucune observation',
                    'statut' => $isReturnedForCorrection ? 'a_corriger' : $this->mapProjectManagerStatus($requisition->status),
                    'statusCode' => $requisition->status,
                    'statusLabel' => $isReturnedForCorrection
                        ? ($hasCorrection ? 'Correction apportée, en attente de visa MP' : 'Renvoyée pour correction')
                        : $this->projectManagerStatusLabel($requisition->status),
                    #'canDecide' => $requisition->status === 'draft' && (! $isFinanceReturned || $hasCorrection),
                    'canDecide' => $requisition->status === 'draft' && (! $isReturnedForCorrection || $hasCorrection),
                    'canEdit' => $canEdit,
                    'financeReturned' => $isReturnedForCorrection,
                    'needsCorrection' => $needsCorrection,
                    'dateSoumission' => $requisition->created_at?->format('d/m/Y') ?? '',
                    'lignes' => $requisition->demandes->map(function ($demande) use ($requisition) {
                        $justificatifs = $demande->justificatifs()->get();

                        return [
                            'id' => (string) $demande->id,
                            'activite' => $demande->activite,
                            'codeAllBudget' => $demande->code_all_budget,
                            'nature' => $demande->nature ?? '',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?: (($demande->duree ?? 0) > 0 ? 'Jour(s)' : 'Unité'),
                            'frais' => (float) $demande->frais_unitaire,
                            'devise' => $requisition->devise,
                            'total' => (float) $demande->total_ligne,
                            'justif' => $justificatifs->map(function ($justificatif) {
                                return [
                                    'id' => (string) $justificatif->id,
                                    'date' => $justificatif->date ?? now()->toDateString(),
                                    'description' => $justificatif->description ?? $justificatif->original_name,
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'scan' => $justificatif->original_name ?? basename($justificatif->file_path ?? 'piece.pdf'),
                                    'fileUrl' => $justificatif->file_path
                                        ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id])
                                        : null,
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
            'draft' => ['key' => 'chef_projet', 'label' => 'Brouillon', 'validator' => 'Initiateur'],
            'visa_mp' => ['key' => 'chef_projet', 'label' => 'Visa Chef Projet', 'validator' => 'Chef de Projet'],
            'controle_finance' => ['key' => 'finance_budget', 'label' => 'Finance & Budget', 'validator' => 'Manager Finances'],
                'rejetee_finance' => ['key' => 'finance_budget', 'label' => 'Rejetée par Finance', 'validator' => 'Manager Finances'],
            'visa_admin' => ['key' => 'finance_budget', 'label' => 'Administration', 'validator' => 'Admin'],
            'approbation_direction' => ['key' => 'finance_budget', 'label' => 'Approbation Direction', 'validator' => 'Direction'],
            'decaissement_caisse' => ['key' => 'caisse_pret', 'label' => 'Caisse (Prêt)', 'validator' => 'Caisse'],
            'cloture' => ['key' => 'caisse_pret', 'label' => 'Clôturé', 'validator' => 'Caisse'],
            default => ['key' => 'chef_projet', 'label' => 'Brouillon', 'validator' => 'Initiateur'],
        };
    }

    private function mapProjectManagerStatus(string $status): string
    {
        return match ($status) {
            'draft' => 'en_attente_mp',
            'rejete' => 'rejete_mp',
            'rejetee' => 'rejete_mp',
            'rejected' => 'rejete_mp',
            'rejetee_finance' => 'rejete_mp',
            'visa_mp', 'controle_finance', 'visa_admin', 'approbation_direction', 'decaissement_caisse', 'cloture' => 'valide_mp',
            default => 'autre',
        };
    }

    private function projectManagerStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Brouillon',
            'visa_mp' => 'Visa Manager Projet',
            'controle_finance' => 'Contrôle Finances',
            'visa_admin' => 'Visa Administration',
            'approbation_direction' => 'Approbation Direction',
            'decaissement_caisse' => 'Décaissement',
            'cloture' => 'Clôturée',
            'rejetee_finance' => 'Rejetée par Finance',
            'rejete', 'rejetee', 'rejected' => 'Rejetée',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    private function formatAmount(float $amount, string $currency): string
    {
        $formatted = number_format($amount, 2, '.', ' ');

        return match ($currency) {
            'USD' => '$' . $formatted . ' USD',
            'EUR' => '€' . $formatted . ' EUR',
            default => $formatted . ' FC',
        };
    }
}
