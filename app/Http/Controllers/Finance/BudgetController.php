<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\BudgetLine;
use App\Models\Donor;
use App\Models\Project;
use App\Services\BudgetImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    /**
     * Affiche le centre budgétaire et le suivi de consommation par donateur et par code.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Accès réservé à la direction financière.');

        $selectedProject = $request->input('project_id', 'all');
        $selectedDonor = $request->input('donor_id', 'all');
        $search = $request->input('search', '');

        $linesQuery = BudgetLine::with(['project', 'donor'])->orderBy('code');

        if ($selectedProject !== 'all') {
            $linesQuery->where('project_id', $selectedProject);
        }

        if ($selectedDonor !== 'all') {
            $linesQuery->where('donor_id', $selectedDonor);
        }

        if (! empty($search)) {
            $linesQuery->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('libelle', 'like', "%{$search}%");
            });
        }

        $budgetLines = $linesQuery->get()->map(function (BudgetLine $line) {
            return [
                'id' => $line->id,
                'code' => $line->code,
                'libelle' => $line->libelle,
                'devise' => $line->devise,
                'project_id' => $line->project_id,
                'project_name' => $line->project?->name ?? 'Général',
                'donor_id' => $line->donor_id,
                'donor_name' => $line->donor?->name ?? 'Fonds Propres',
                'budget_initial' => (float) $line->budget_initial,
                'montant_engage' => (float) $line->montant_engage,
                'montant_decaisse' => (float) $line->montant_decaisse,
                'solde' => (float) $line->solde,
                'taux_consommation' => $line->taux_consommation,
            ];
        });

        $donorsSummary = Donor::with('budgetLines')->get()->map(function (Donor $donor) {
            $lines = $donor->budgetLines;
            $initialUSD = (float) $lines->where('devise', 'USD')->sum('budget_initial');
            $decaisseUSD = (float) $lines->where('devise', 'USD')->sum('montant_decaisse');
            $engageUSD = (float) $lines->where('devise', 'USD')->sum('montant_engage');
            $soldeUSD = (float) $lines->where('devise', 'USD')->sum('solde');

            $taux = $initialUSD > 0 ? round(($decaisseUSD / $initialUSD) * 100, 2) : 0;

            return [
                'id' => $donor->id,
                'name' => $donor->name,
                'code' => $donor->code,
                'lines_count' => $lines->count(),
                'total_budget_usd' => $initialUSD,
                'montant_engage_usd' => $engageUSD,
                'montant_decaisse_usd' => $decaisseUSD,
                'solde_usd' => $soldeUSD,
                'taux_consommation' => $taux,
            ];
        });

        $projects = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        $donors = Donor::orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('Finance/Budgets/Index', [
            'selectedProject' => $selectedProject,
            'selectedDonor' => $selectedDonor,
            'search' => $search,
            'projects' => $projects,
            'donors' => $donors,
            'donorsSummary' => $donorsSummary,
            'budgetLines' => $budgetLines,
            'stats' => [
                'totalInitialUSD' => (float) $budgetLines->where('devise', 'USD')->sum('budget_initial'),
                'totalEngageUSD' => (float) $budgetLines->where('devise', 'USD')->sum('montant_engage'),
                'totalDecaisseUSD' => (float) $budgetLines->where('devise', 'USD')->sum('montant_decaisse'),
                'totalSoldeUSD' => (float) $budgetLines->where('devise', 'USD')->sum('solde'),
                'totalLinesCount' => $budgetLines->count(),
            ],
        ]);
    }

    /**
     * Traite l'importation du budget de référence depuis un fichier Excel ou CSV.
     */
    public function import(Request $request, BudgetImportService $importService): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240'],
        ], [
            'project_id.required' => 'Veuillez sélectionner le projet de rattachement pour ce budget.',
            'file.required' => 'Veuillez sélectionner un fichier Excel ou CSV.',
            'file.mimes' => 'Le fichier doit être au format Excel (.xlsx, .xls) ou CSV (.csv).',
        ]);

        $result = $importService->import($validated['file'], $validated['project_id']);

        if (! $result['success']) {
            return Redirect::back()->with('error', $result['message']);
        }

        return Redirect::back()->with('success', $result['message']);
    }

    /**
     * Enregistre un nouveau bailleur de fonds / Donateur.
     */
    public function storeDonor(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:donors,name'],
            'code' => ['required', 'string', 'max:50', 'unique:donors,code'],
            'description' => ['nullable', 'string'],
        ]);

        Donor::create($validated);

        return Redirect::back()->with('success', "Donateur {$validated['name']} enregistré avec succès.");
    }

    /**
     * Enregistre manuellement une ligne budgétaire unitaire.
     */
    public function storeBudgetLine(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'donor_id' => ['nullable', 'exists:donors,id'],
            'code' => ['nullable', 'string', 'max:100'],
            'category_code' => ['nullable', 'string', 'max:50'],
            'subcategory_code' => ['nullable', 'string', 'max:50'],
            'descript_code' => ['nullable', 'string', 'max:50'],
            'split_code' => ['nullable', 'string', 'max:50'],
            'libelle' => ['required', 'string', 'max:255'],
            'devise' => ['required', 'in:USD,FC,EUR'],
            'budget_initial' => ['required', 'numeric', 'min:0'],
        ]);

        $code = trim((string) ($validated['code'] ?? ''));
        if (empty($code)) {
            $code = BudgetLine::buildCode(
                $validated['category_code'] ?? null,
                $validated['subcategory_code'] ?? null,
                $validated['descript_code'] ?? null,
                $validated['split_code'] ?? null
            );
        }

        $budgetInitial = (float) $validated['budget_initial'];

        BudgetLine::updateOrCreate(
            [
                'project_id' => $validated['project_id'],
                'code' => $code,
            ],
            [
                'donor_id' => $validated['donor_id'] ?? null,
                'category_code' => $validated['category_code'] ?? null,
                'subcategory_code' => $validated['subcategory_code'] ?? null,
                'descript_code' => $validated['descript_code'] ?? null,
                'split_code' => $validated['split_code'] ?? null,
                'libelle' => $validated['libelle'],
                'devise' => $validated['devise'],
                'budget_initial' => $budgetInitial,
                'solde' => $budgetInitial,
            ]
        );

        return Redirect::back()->with('success', "Ligne budgétaire {$code} enregistrée.");
    }
}