<?php

namespace App\Http\Controllers\ProjectManager;

use App\Http\Controllers\Controller;
use App\Models\Demande;
use App\Models\Project;
use App\Models\Requisition;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportingController extends Controller
{
    /**
     * Génère le rapport périodique consolidé des réquisitions du projet (Mensuel, Trimestriel, Annuel).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('project_manager') || $user->hasRole('admin'), 403, 'Accès réservé aux Chefs de Projet.');

        $currentYear = (int) now()->format('Y');
        $annee = (int) $request->input('annee', $currentYear);
        $typePeriode = $request->input('type_periode', 'monthly'); // monthly, quarterly, annual
        $mois = (int) $request->input('mois', now()->month);
        $trimestre = (int) $request->input('trimestre', (int) ceil(now()->month / 3));

        $project = $user->project;
        if (! $project && $user->hasRole('admin')) {
            $projectId = $request->input('project_id', Project::first()?->id);
            $project = Project::find($projectId) ?? Project::first();
        }

        [$startDate, $endDate, $labelPeriode] = $this->calculateDateRange($typePeriode, $annee, $mois, $trimestre);

        $query = Requisition::with(['user', 'demandes', 'cashier'])
            ->whereBetween('created_at', [$startDate, $endDate]);

        if ($project) {
            $query->where(function ($q) use ($project) {
                $q->where('project_id', $project->id)
                  ->orWhere('projet', $project->name);
            });
        }

        $allRequisitions = $query->orderBy('created_at')->get();

        $totalSoumisUSD = (float) $allRequisitions->where('devise', 'USD')->sum('montant_total');
        $totalSoumisFC = (float) $allRequisitions->where('devise', 'FC')->sum('montant_total');

        $decaissees = $allRequisitions->where('status', 'decaisse');
        $totalDecaisseUSD = (float) $decaissees->where('devise', 'USD')->sum('montant_total');
        $totalDecaisseFC = (float) $decaissees->where('devise', 'FC')->sum('montant_total');

        $enCours = $allRequisitions->whereIn('status', ['draft', 'visa_mp', 'controle_finance', 'visa_admin', 'decaissement_caisse']);
        $totalEnCoursUSD = (float) $enCours->where('devise', 'USD')->sum('montant_total');
        $totalEnCoursFC = (float) $enCours->where('devise', 'FC')->sum('montant_total');

        $rejetees = $allRequisitions->where('status', 'rejetee');
        $totalRejeteUSD = (float) $rejetees->where('devise', 'USD')->sum('montant_total');

        $achats = $allRequisitions->where('nature_requisition', 'Achat');
        $services = $allRequisitions->where('nature_requisition', 'Service');

        $demandesIds = $allRequisitions->pluck('id');
        $lignesVentilation = Demande::whereIn('requisition_id', $demandesIds)
            ->get()
            ->groupBy(fn ($d) => trim((string) ($d->code_allocation ?: $d->code_all_budget ?: 'Non spécifié')))
            ->map(function ($group, $code) {
                return [
                    'code' => $code,
                    'nombre_lignes' => $group->count(),
                    'total_montant' => (float) $group->sum('total_ligne'),
                    'activites' => $group->pluck('activite')->unique()->take(3)->values()->all(),
                ];
            })
            ->values()
            ->sortByDesc('total_montant')
            ->values()
            ->all();

        $availableProjects = $user->hasRole('admin')
            ? Project::orderBy('name')->get(['id', 'name', 'full_name'])
            : [];

        return Inertia::render('ProjectManager/Reporting/Index', [
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
                'full_name' => $project->full_name,
            ] : null,
            'filters' => [
                'annee' => $annee,
                'type_periode' => $typePeriode,
                'mois' => $mois,
                'trimestre' => $trimestre,
                'labelPeriode' => $labelPeriode,
            ],
            'stats' => [
                'countTotal' => $allRequisitions->count(),
                'countDecaissees' => $decaissees->count(),
                'countEnCours' => $enCours->count(),
                'countRejetees' => $rejetees->count(),
                'totalSoumisUSD' => $totalSoumisUSD,
                'totalSoumisFC' => $totalSoumisFC,
                'totalDecaisseUSD' => $totalDecaisseUSD,
                'totalDecaisseFC' => $totalDecaisseFC,
                'totalEnCoursUSD' => $totalEnCoursUSD,
                'totalEnCoursFC' => $totalEnCoursFC,
                'totalRejeteUSD' => $totalRejeteUSD,
                'countAchats' => $achats->count(),
                'countServices' => $services->count(),
                'totalAchatsUSD' => (float) $achats->where('devise', 'USD')->sum('montant_total'),
                'totalServicesUSD' => (float) $services->where('devise', 'USD')->sum('montant_total'),
            ],
            'lignesVentilation' => $lignesVentilation,
            'requisitions' => $allRequisitions->map(fn (Requisition $r) => [
                'id' => $r->id,
                'numero' => $r->numero_requisition,
                'date' => $r->created_at->format('d/m/Y'),
                'demandeur' => $r->user?->name ?? 'Agent',
                'nature' => $r->nature_requisition,
                'montant' => (float) $r->montant_total,
                'devise' => $r->devise,
                'caisse' => $r->caisse_decaissement,
                'status' => $r->status,
                'is_decaissee' => $r->status === 'decaisse',
                'mode_paiement' => $r->mode_paiement,
                'reference_paiement' => $r->reference_paiement,
                'date_decaissement' => $r->date_decaissement?->format('d/m/Y'),
            ])->values()->all(),
            'availableProjects' => $availableProjects,
        ]);
    }

    /**
     * Calcule la plage de dates en fonction de la périodicité choisie.
     */
    protected function calculateDateRange(string $type, int $year, int $month, int $quarter): array
    {
        $nomsMois = [
            1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
            9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre',
        ];

        if ($type === 'annual') {
            $start = Carbon::create($year, 1, 1, 0, 0, 0)->startOfYear();
            $end = Carbon::create($year, 12, 31, 23, 59, 59)->endOfYear();
            return [$start, $end, "Année {$year}"];
        }

        if ($type === 'quarterly') {
            $quarterMonth = match ($quarter) {
                1 => 1,
                2 => 4,
                3 => 7,
                4 => 10,
                default => 1,
            };

            $start = Carbon::create($year, $quarterMonth, 1, 0, 0, 0)->startOfQuarter();
            $end = Carbon::create($year, $quarterMonth, 1, 23, 59, 59)->endOfQuarter();
            return [$start, $end, "Trimestre {$quarter} {$year}"];
        }

        $safeMonth = max(1, min(12, $month));
        $start = Carbon::create($year, $safeMonth, 1, 0, 0, 0)->startOfMonth();
        $end = Carbon::create($year, $safeMonth, 1, 23, 59, 59)->endOfMonth();

        return [$start, $end, ($nomsMois[$safeMonth] ?? '') . " {$year}"];
    }
}