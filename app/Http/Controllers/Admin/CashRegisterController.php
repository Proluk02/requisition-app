<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class CashRegisterController extends Controller
{
    /**
     * Liste des caisses configurées.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $cashRegisters = CashRegister::withCount(['sessions', 'movements'])
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->orderBy('name')
            ->get()
            ->map(fn (CashRegister $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'devise' => $c->devise,
                'solde_actuel' => (float) $c->solde_actuel,
                'is_active' => (bool) $c->is_active,
                'sessions_count' => $c->sessions_count,
                'movements_count' => $c->movements_count,
            ]);

        return Inertia::render('Admin/CashRegisters/Index', [
            'cashRegisters' => $cashRegisters,
            'search' => $search,
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

        return Redirect::back()->with('success', "Caisse {$caisse->name} créée.");
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
        ]);

        $cashRegister->update([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'devise' => $validated['devise'],
            'is_active' => $validated['is_active'],
        ]);

        return Redirect::back()->with('success', "Caisse {$cashRegister->name} mise à jour.");
    }

    /**
     * Supprime une caisse si aucun mouvement financier n'y a été opéré.
     */
    public function destroy(CashRegister $cashRegister): RedirectResponse
    {
        if ($cashRegister->movements()->exists() || $cashRegister->sessions()->exists()) {
            return back()->with('error', 'Suppression impossible : cette caisse possède un historique financier.');
        }

        $name = $cashRegister->name;
        $cashRegister->delete();

        return back()->with('success', "Caisse {$name} supprimée avec succès.");
    }
}
