<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Liste des projets institutionnels avec leurs sites affectés.
     */
    public function index(): Response
    {
        $projects = Project::with('sites:id,name')
            ->withCount(['requisitions', 'users', 'budgetLines'])
            ->orderBy('name')
            ->get()
            ->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'full_name' => $p->full_name,
                'description' => $p->description,
                'sites' => $p->sites->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
                'sites_count' => $p->sites->count(),
                'users_count' => $p->users_count,
                'requisitions_count' => $p->requisitions_count,
                'budget_lines_count' => $p->budget_lines_count,
            ]);

        $availableSites = Site::orderBy('name')->get(['id', 'name', 'location']);

        return Inertia::render('Admin/Projects/Index', [
            'projects' => $projects,
            'availableSites' => $availableSites,
        ]);
    }

    /**
     * Enregistre un nouveau projet et ses liaisons aux sites.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:projects,name'],
            'full_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'site_ids' => ['nullable', 'array'],
            'site_ids.*' => ['exists:sites,id'],
        ], [
            'name.unique' => 'Un projet avec ce sigle existe déjà.',
        ]);

        $project = Project::create([
            'name' => strtoupper(trim($validated['name'])),
            'full_name' => trim($validated['full_name']),
            'description' => $validated['description'] ?? null,
        ]);

        if (! empty($validated['site_ids'])) {
            $project->sites()->sync($validated['site_ids']);
        }

        return Redirect::back()->with('success', "Projet {$project->name} créé et rattaché avec succès.");
    }

    /**
     * Met à jour le projet et synchronise ses sites.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:projects,name,'.$project->id],
            'full_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'site_ids' => ['nullable', 'array'],
            'site_ids.*' => ['exists:sites,id'],
        ]);

        $project->update([
            'name' => strtoupper(trim($validated['name'])),
            'full_name' => trim($validated['full_name']),
            'description' => $validated['description'] ?? null,
        ]);

        $project->sites()->sync($validated['site_ids'] ?? []);

        return Redirect::back()->with('success', "Projet {$project->name} mis à jour.");
    }

    /**
     * Supprime un projet s'il ne contient pas d'engagements financiers.
     */
    public function destroy(Project $project): RedirectResponse
    {
        if ($project->requisitions()->exists()) {
            return Redirect::back()->with('error', 'Suppression impossible : ce projet contient des réquisitions enregistrées.');
        }

        $projectName = $project->name;
        $project->sites()->detach();
        $project->delete();

        return Redirect::back()->with('success', "Projet {$projectName} supprimé avec succès.");
    }
}
