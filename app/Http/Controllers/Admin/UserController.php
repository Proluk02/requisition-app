<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->with(['project:id,name', 'site:id,name', 'roles:id,name'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->role, fn ($query, $role) => $query->where('role', $role))
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->project_id, fn ($query, $projectId) => $query->where('project_id', $projectId))
            ->when($request->site_id, fn ($query, $siteId) => $query->where('site_id', $siteId))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'status', 'project_id', 'site_id']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create()
    {
        $this->authorize('create', User::class);

        return Inertia::render('Admin/Users/Create', [
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => $data['role'],
                'project_id' => $data['project_id'] ?? null,
                'site_id' => $data['site_id'] ?? null,
                'status' => $data['status'],
            ]);

            $user->assignRole($data['role']);
        });

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur créé avec succès.');
    }

    public function edit(User $user)
    {
        $this->authorize('update', $user);

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user->only(['id', 'name', 'email', 'role', 'status', 'project_id', 'site_id']),
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $user) {
            $user->update([
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => $data['role'],
                'project_id' => $data['project_id'] ?? null,
                'site_id' => $data['site_id'] ?? null,
                'status' => $data['status'],
                ...(! empty($data['password']) ? ['password' => Hash::make($data['password'])] : []),
            ]);

            $user->syncRoles([$data['role']]);
        });

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur mis à jour avec succès.');
    }

    public function toggleStatus(User $user)
    {
        $this->authorize('toggleStatus', $user);

        $user->update([
            'status' => $user->status === 'active' ? 'inactive' : 'active',
        ]);

        return back()->with('success', $user->status === 'active'
            ? 'Utilisateur activé.'
            : 'Utilisateur désactivé.');
    }

    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur supprimé avec succès.');
    }
}