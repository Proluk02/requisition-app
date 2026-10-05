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

class SiteController extends Controller
{
    /**
     * Liste des sites opérationnels et des projets qui s'y déroulent.
     */
    public function index(): Response
    {
        $sites = Site::with('projects:id,name')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn (Site $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'location' => $s->location,
                'projects' => $s->projects->map(fn ($p) => ['id' => $p->id, 'name' => $p->name]),
                'projects_count' => $s->projects->count(),
                'users_count' => $s->users_count,
            ]);

        $availableProjects = Project::orderBy('name')->get(['id', 'name', 'full_name']);

        return Inertia::render('Admin/Sites/Index', [
            'sites' => $sites,
            'availableProjects' => $availableProjects,
        ]);
    }

    /**
     * Enregistre un nouveau site.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:sites,name'],
            'location' => ['nullable', 'string', 'max:255'],
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => ['exists:projects,id'],
        ], [
            'name.unique' => 'Un site avec ce nom existe déjà.',
        ]);

        $site = Site::create([
            'name' => trim($validated['name']),
            'location' => $validated['location'] ?? null,
        ]);

        if (! empty($validated['project_ids'])) {
            $site->projects()->sync($validated['project_ids']);
        }

        return Redirect::back()->with('success', "Site {$site->name} créé avec succès.");
    }

    /**
     * Met à jour le site et ses projets affectés.
     */
    public function update(Request $request, Site $site): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:sites,name,' . $site->id],
            'location' => ['nullable', 'string', 'max:255'],
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => ['exists:projects,id'],
        ]);

        $site->update([
            'name' => trim($validated['name']),
            'location' => $validated['location'] ?? null,
        ]);

        $site->projects()->sync($validated['project_ids'] ?? []);

        return Redirect::back()->with('success', "Site {$site->name} mis à jour.");
    }

    /**
     * Supprime un site s'il ne contient pas d'utilisateurs rattachés.
     */
    public function destroy(Site $site): RedirectResponse
    {
        if ($site->users()->exists()) {
            return Redirect::back()->with('error', 'Suppression impossible : des utilisateurs sont affectés à ce site.');
        }

        $siteName = $site->name;
        $site->projects()->detach();
        $site->delete();

        return Redirect::back()->with('success', "Site {$siteName} supprimé avec succès.");
    }
}