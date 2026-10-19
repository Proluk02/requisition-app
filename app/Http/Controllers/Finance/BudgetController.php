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
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Accès réservé à la direction financière.');

        $selectedProject = $request->input('project_id', 'all');
        $selectedDonor = $request->input('donor_id', 'all');
        $search = $request->input('search', '');

        $linesQuery = BudgetLine::with(['projects', 'donor'])->orderBy('code');

        if ($selectedProject !== 'all') {
            $linesQuery->whereHas('projects', function ($query) use ($selectedProject) {
                $query->where('projects.id', $selectedProject);
            });
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
                'category_code' => $line->category_code,
                'subcategory_code' => $line->subcategory_code,
                'descript_code' => $line->descript_code,
                'split_code' => $line->split_code,
                'libelle' => $line->libelle,
                'devise' => $line->devise,
                'project_ids' => $line->projects->pluck('id')->toArray(),
                'project_name' => $line->projects->pluck('name')->join(', ') ?: 'Général',
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
                'description' => $donor->description,
                'lines_count' => $lines->count(),
                'total_budget_usd' => $initialUSD,
                'montant_engage_usd' => $engageUSD,
                'montant_decaisse_usd' => $decaisseUSD,
                'solde_usd' => $soldeUSD,
                'taux_consommation' => $taux,
            ];
        });

        $projects = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        $donors = Donor::orderBy('name')->get(['id', 'name', 'code', 'description']);

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

    public function importForm(): Response
    {
        return Inertia::render('Finance/Budgets/Import', [
            'projects' => Project::orderBy('name')->get(['id', 'name', 'full_name']),
        ]);
    }

    public function import(Request $request, BudgetImportService $importService): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['exists:projects,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:10240'],
        ], [
            'project_ids.required' => 'Veuillez sélectionner au moins un projet de rattachement pour ce budget.',
            'file.required' => 'Veuillez sélectionner un fichier Excel ou CSV.',
            'file.mimes' => 'Le fichier doit être au format Excel (.xlsx, .xls) ou CSV (.csv).',
        ]);

        $result = $importService->import($validated['file'], $validated['project_ids']);

        if (! $result['success']) {
            return Redirect::back()->with('error', $result['message']);
        }

        return Redirect::back()->with('success', $result['message']);
    }
    public function storeBudgetLine(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['exists:projects,id'],
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

        $existing = BudgetLine::where('code', $code)->first();

        if ($existing) {
            $solde = max(0, $budgetInitial - (float) $existing->montant_engage);
            $existing->update([
                'donor_id' => $validated['donor_id'] ?? null,
                'category_code' => $validated['category_code'] ?? null,
                'subcategory_code' => $validated['subcategory_code'] ?? null,
                'descript_code' => $validated['descript_code'] ?? null,
                'split_code' => $validated['split_code'] ?? null,
                'libelle' => $validated['libelle'],
                'devise' => $validated['devise'],
                'budget_initial' => $budgetInitial,
                'solde' => $solde,
            ]);

            $existing->projects()->syncWithoutDetaching($validated['project_ids']);

            return Redirect::back()->with('success', "Ligne budgétaire {$code} mise à jour.");
        }

        $newLine = BudgetLine::create([
            'donor_id' => $validated['donor_id'] ?? null,
            'code' => $code,
            'category_code' => $validated['category_code'] ?? null,
            'subcategory_code' => $validated['subcategory_code'] ?? null,
            'descript_code' => $validated['descript_code'] ?? null,
            'split_code' => $validated['split_code'] ?? null,
            'libelle' => $validated['libelle'],
            'devise' => $validated['devise'],
            'budget_initial' => $budgetInitial,
            'montant_engage' => 0,
            'montant_decaisse' => 0,
            'solde' => $budgetInitial,
        ]);

        $newLine->projects()->sync($validated['project_ids']);

        return Redirect::back()->with('success', "Ligne budgétaire {$code} enregistrée avec succès.");
    }

    public function updateBudgetLine(Request $request, BudgetLine $budgetLine): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['exists:projects,id'],
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
        $duplicate = BudgetLine::where('code', $code)
            ->where('id', '!=', $budgetLine->id)
            ->exists();

        if ($duplicate) {
            return Redirect::back()->with('error', "Une autre ligne avec le code {$code} existe déjà dans le système.");
        }

        $budgetInitial = (float) $validated['budget_initial'];
        $solde = max(0, $budgetInitial - (float) $budgetLine->montant_engage);

        $budgetLine->update([
            'donor_id' => $validated['donor_id'] ?? null,
            'code' => $code,
            'category_code' => $validated['category_code'] ?? null,
            'subcategory_code' => $validated['subcategory_code'] ?? null,
            'descript_code' => $validated['descript_code'] ?? null,
            'split_code' => $validated['split_code'] ?? null,
            'libelle' => $validated['libelle'],
            'devise' => $validated['devise'],
            'budget_initial' => $budgetInitial,
            'solde' => $solde,
        ]);

        $budgetLine->projects()->sync($validated['project_ids']);

        return Redirect::back()->with('success', "Ligne budgétaire {$code} modifiée avec succès.");
    }

    public function destroyBudgetLine(Request $request, BudgetLine $budgetLine): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        if ((float) $budgetLine->montant_engage > 0 || (float) $budgetLine->montant_decaisse > 0) {
            return Redirect::back()->with(
                'error',
                "Suppression impossible : des montants sont déjà engagés (" . number_format($budgetLine->montant_engage, 2) . " {$budgetLine->devise}) ou décaissés sur cette ligne."
            );
        }

        if ($budgetLine->cashMovements()->exists()) {
            return Redirect::back()->with(
                'error',
                "Suppression impossible : des mouvements de trésorerie sont directement liés à cette ligne budgétaire."
            );
        }

        $code = $budgetLine->code;
        $budgetLine->projects()->detach();
        $budgetLine->delete();

        return Redirect::back()->with('success', "Ligne budgétaire {$code} supprimée.");
    }
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

    public function updateDonor(Request $request, Donor $donor): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:donors,name,' . $donor->id],
            'code' => ['required', 'string', 'max:50', 'unique:donors,code,' . $donor->id],
            'description' => ['nullable', 'string'],
        ]);

        $donor->update($validated);

        return Redirect::back()->with('success', "Donateur {$donor->name} mis à jour avec succès.");
    }

    public function destroyDonor(Request $request, Donor $donor): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $linesCount = $donor->budgetLines()->count();
        if ($linesCount > 0) {
            return Redirect::back()->with(
                'error',
                "Suppression impossible : ce bailleur finance actuellement {$linesCount} ligne(s) budgétaire(s). Réaffectez d'abord ces lignes."
            );
        }

        $name = $donor->name;
        $donor->delete();

        return Redirect::back()->with('success', "Donateur {$name} supprimé avec succès.");
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->storeBudgetLine($request);
    }

    public function update(Request $request, BudgetLine $budgetLine): RedirectResponse
    {
        return $this->updateBudgetLine($request, $budgetLine);
    }

    public function destroy(Request $request, BudgetLine $budgetLine): RedirectResponse
    {
        return $this->destroyBudgetLine($request, $budgetLine);
    }
}