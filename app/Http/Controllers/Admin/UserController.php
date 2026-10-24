<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->with(['project:id,name', 'site:id,name', 'cashRegisters:id,name', 'roles:id,name'])
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
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'status', 'project_id', 'site_id']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
            'cashRegisters' => CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create()
    {
        $this->authorize('create', User::class);

        return Inertia::render('Admin/Users/Create', [
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
            'cashRegisters' => CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'devise']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'status' => ['required', 'in:active,inactive'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'is_director_interim' => ['sometimes', 'boolean'],
            'cash_register_ids' => ['nullable', 'array'],
            'cash_register_ids.*' => ['exists:cash_registers,id'],
        ]);

        $isInterim = $data['role'] === 'admin_manager' && $request->boolean('is_director_interim');

        DB::transaction(function () use ($data, $isInterim) {
            $user = User::create([
                'name' => $data['name'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'signature_pin' => Hash::make($data['pin']),
                'pin_set_at' => now(),
                'role' => $data['role'],
                'project_id' => $data['project_id'] ?? null,
                'site_id' => $data['site_id'] ?? null,
                'is_director_interim' => $isInterim,
                'status' => $data['status'],
            ]);

            $user->assignRole($data['role']);

            if ($data['role'] === 'cashier' && ! empty($data['cash_register_ids'])) {
                $user->cashRegisters()->sync($data['cash_register_ids']);
            }
        });

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur créé avec succès.');
    }

    public function edit(User $user)
    {
        $this->authorize('update', $user);

        $user->load('cashRegisters:id');

        return Inertia::render('Admin/Users/Edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'project_id' => $user->project_id,
                'site_id' => $user->site_id,
                'is_director_interim' => (bool) $user->is_director_interim,
                'cash_register_ids' => $user->cashRegisters->pluck('id')->all(),
            ],
            'projects' => Project::orderBy('name')->get(['id', 'name']),
            'sites' => Site::orderBy('name')->get(['id', 'name']),
            'cashRegisters' => CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'devise']),
            'roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'status' => ['required', 'in:active,inactive'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'is_director_interim' => ['sometimes', 'boolean'],
            'cash_register_ids' => ['nullable', 'array'],
            'cash_register_ids.*' => ['exists:cash_registers,id'],
        ]);

        $isInterim = $data['role'] === 'admin_manager' && $request->boolean('is_director_interim');

        DB::transaction(function () use ($data, $user, $isInterim) {
            $updateData = [
                'name' => $data['name'],
                'email' => $data['email'],
                'role' => $data['role'],
                'project_id' => $data['project_id'] ?? null,
                'site_id' => $data['site_id'] ?? null,
                'is_director_interim' => $isInterim,
                'status' => $data['status'],
            ];

            if (! empty($data['password'])) {
                $updateData['password'] = Hash::make($data['password']);
            }

            $user->update($updateData);
            $user->syncRoles([$data['role']]);

            if ($data['role'] === 'cashier') {
                $user->cashRegisters()->sync($data['cash_register_ids'] ?? []);
            } else {
                $user->cashRegisters()->detach();
            }
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

        if ($user->requisitions()->exists() || $user->signatures()->exists()) {
            return back()->with('error', 'Suppression impossible : cet utilisateur possède un historique financier auditable.');
        }

        $user->cashRegisters()->detach();
        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur supprimé avec succès.');
    }
}
