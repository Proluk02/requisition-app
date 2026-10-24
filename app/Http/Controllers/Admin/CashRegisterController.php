<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class CashRegisterController extends Controller
{
    /**
     * Liste des caisses configurées avec leurs caissiers affectés.
     */
    public function index(): Response
    {
        $cashRegisters = CashRegister::with('cashiers:id,name,email')
            ->withCount(['sessions', 'movements'])
            ->orderBy('name')
            ->get()
            ->map(fn (CashRegister $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_active' => (bool) $c->is_active,
                'cashiers' => $c->cashiers->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email]),
                'sessions_count' => $c->sessions_count,
                'movements_count' => $c->movements_count,
            ]);

        $availableCashiers = User::role('cashier')
            ->orWhere('role', 'cashier')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/CashRegisters/Index', [
            'cashRegisters' => $cashRegisters,
            'availableCashiers' => $availableCashiers,
        ]);
    }

    /**
     * Crée une nouvelle caisse et affecte les caissiers autorisés.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:cash_registers,name'],
            'code' => ['required', 'string', 'max:50', 'unique:cash_registers,code'],
            'devise' => ['required', 'in:USD,FC'],
            'solde_initial' => ['required', 'numeric', 'min:0'],
            'cashier_ids' => ['nullable', 'array'],
            'cashier_ids.*' => ['exists:users,id'],
        ], [
            'name.unique' => 'Une caisse portant ce nom existe déjà.',
            'code.unique' => 'Ce code caisse est déjà attribué.',
        ]);

        $caisse = CashRegister::create([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'devise' => $validated['devise'],
            'solde_actuel' => (float) $validated['solde_initial'],
            'is_active' => true,
        ]);

        if (! empty($validated['cashier_ids'])) {
            $caisse->cashiers()->sync($validated['cashier_ids']);
        }

        return Redirect::back()->with('success', "Caisse {$caisse->name} créée et caissiers affectés.");
    }

    /**
     * Met à jour la caisse et réassigne les caissiers.
     */
    public function update(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:cash_registers,name,'.$cashRegister->id],
            'code' => ['required', 'string', 'max:50', 'unique:cash_registers,code,'.$cashRegister->id],
            'devise' => ['required', 'in:USD,FC'],
            'is_active' => ['required', 'boolean'],
            'cashier_ids' => ['nullable', 'array'],
            'cashier_ids.*' => ['exists:users,id'],
        ]);

        $cashRegister->update([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'devise' => $validated['devise'],
            'is_active' => $validated['is_active'],
        ]);

        $cashRegister->cashiers()->sync($validated['cashier_ids'] ?? []);

        return Redirect::back()->with('success', "Caisse {$cashRegister->name} mise à jour.");
    }

    /**
     * Supprime une caisse si aucun mouvement financier n'y a été opéré.
     */
    public function destroy(CashRegister $cashRegister): RedirectResponse
    {
        if ($cashRegister->movements()->exists()) {
            return Redirect::back()->with('error', 'Suppression impossible : cette caisse contient des mouvements financiers enregistrés.');
        }

        $name = $cashRegister->name;
        $cashRegister->cashiers()->detach();
        $cashRegister->delete();

        return Redirect::back()->with('success', "Caisse {$name} supprimée avec succès.");
    }
}
