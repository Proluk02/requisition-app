<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CaisseManagementController extends Controller
{
    /**
     * Vue générale des caisses : soldes en direct, caissiers affectés et mouvements récents.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $selectedCaisseId = $request->input('caisse_id', '');

        $caisses = CashRegister::with(['activeSession', 'cashiers:id,name,email'])
            ->withCount(['movements', 'sessions'])
            ->orderBy('name')
            ->get()
            ->map(function (CashRegister $c) {
                $reqsCount = Requisition::where('caisse_decaissement', $c->name)->count();

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'code' => $c->code,
                    'devise' => $c->devise,
                    'solde_actuel' => (float) $c->solde_actuel,
                    'is_active' => (bool) $c->is_active,
                    'is_ouverte' => $c->isOuverte(),
                    'cashiers' => $c->cashiers->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email]),
                    'requisitions_count' => $reqsCount,
                    'movements_count' => $c->movements_count,
                    'active_session' => $c->activeSession ? [
                        'id' => $c->activeSession->id,
                        'status' => $c->activeSession->status,
                        'solde_ouverture' => (float) $c->activeSession->solde_ouverture,
                        'total_entrees' => (float) $c->activeSession->total_entrees,
                        'total_sorties' => (float) $c->activeSession->total_sorties,
                        'opened_at' => $c->activeSession->opened_at?->format('H:i'),
                    ] : null,
                ];
            });

        $movementsQuery = CashMovement::with(['cashRegister', 'cashier'])->orderByDesc('created_at')->limit(30);

        if (! empty($selectedCaisseId) && $selectedCaisseId !== 'all') {
            $movementsQuery->where('cash_register_id', $selectedCaisseId);
        }

        $movements = $movementsQuery->get()->map(fn (CashMovement $m) => [
            'id' => $m->id,
            'type' => $m->type,
            'numero_piece' => $m->numero_piece,
            'date_mouvement' => $m->date_mouvement->format('d/m/Y'),
            'tiers_nom' => $m->tiers_nom,
            'montant' => (float) $m->montant,
            'devise' => $m->devise,
            'motif' => $m->motif,
            'imputation' => $m->imputation,
            'caisse_nom' => $m->cashRegister?->name,
            'cashier_nom' => $m->cashier?->name,
        ]);

        $availableCashiers = User::role('cashier')
            ->orWhere('role', 'cashier')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $pendingSessionsCount = CashRegisterSession::where('status', 'en_attente_autorisation')->count();

        return Inertia::render('Finance/Caisses/Index', [
            'caisses' => $caisses,
            'selectedCaisseId' => $selectedCaisseId,
            'movements' => $movements,
            'availableCashiers' => $availableCashiers,
            'pendingSessionsCount' => $pendingSessionsCount,
            'stats' => [
                'totalSoldeUSD' => (float) CashRegister::where('devise', 'USD')->sum('solde_actuel'),
                'totalSoldeFC' => (float) CashRegister::where('devise', 'FC')->sum('solde_actuel'),
                'caissesOuvertesCount' => $caisses->filter(fn ($c) => $c['is_ouverte'])->count(),
                'totalCaissesCount' => $caisses->count(),
            ],
        ]);
    }

    /**
     * Liste complète des sessions journalières avec historique et demandes en attente de visa.
     */
    public function sessions(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $statusFilter = $request->input('status', 'all');
        $caisseFilter = $request->input('caisse_id', 'all');

        $query = CashRegisterSession::with(['cashRegister', 'cashier:id,name', 'authorizedBy:id,name'])
            ->orderByDesc('date_session')
            ->orderByDesc('created_at');

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($caisseFilter !== 'all') {
            $query->where('cash_register_id', $caisseFilter);
        }

        $sessions = $query->paginate(20)->withQueryString()->through(fn (CashRegisterSession $s) => [
            'id' => $s->id,
            'caisse_id' => $s->cash_register_id,
            'caisse_name' => $s->cashRegister?->name,
            'caisse_devise' => $s->cashRegister?->devise,
            'cashier_name' => $s->cashier?->name,
            'authorized_by_name' => $s->authorizedBy?->name,
            'date_session' => $s->date_session->format('d/m/Y'),
            'solde_ouverture' => (float) $s->solde_ouverture,
            'solde_fermeture' => $s->solde_fermeture !== null ? (float) $s->solde_fermeture : null,
            'total_entrees' => (float) $s->total_entrees,
            'total_sorties' => (float) $s->total_sorties,
            'status' => $s->status,
            'opened_at' => $s->opened_at?->format('H:i'),
            'closed_at' => $s->closed_at?->format('H:i'),
            'observation_ouverture' => $s->observation_ouverture,
            'observation_cloture' => $s->observation_cloture,
        ]);

        $caissesList = CashRegister::orderBy('name')->get(['id', 'name', 'code', 'devise']);
        $pendingApprovisionnements = CashMovement::query()
            ->with(['cashRegister:id,name,devise', 'cashier:id,name'])
            ->where('type', 'entree')
            ->where('is_approvisionnement_initial', true)
            ->where('status_validation', 'en_attente_finance')
            ->orderBy('created_at')
            ->get()
            ->map(fn (CashMovement $movement) => [
                'id' => $movement->id,
                'numero_piece' => $movement->numero_piece,
                'date_mouvement' => $movement->date_mouvement->format('d/m/Y'),
                'caisse_name' => $movement->cashRegister?->name ?? 'Caisse inconnue',
                'caisse_devise' => $movement->devise,
                'cashier_name' => $movement->cashier?->name ?? 'Caissier inconnu',
                'tiers_nom' => $movement->tiers_nom,
                'montant' => (float) $movement->montant,
                'motif' => $movement->motif,
                'bordereau_banque_ref' => $movement->bordereau_banque_ref,
                'bordereau_url' => $movement->bordereau_file_path
                    ? Storage::disk('public')->url($movement->bordereau_file_path)
                    : null,
            ])
            ->values();

        return Inertia::render('Finance/Caisses/Sessions', [
            'sessions' => $sessions,
            'caissesList' => $caissesList,
            'pendingApprovisionnements' => $pendingApprovisionnements,
            'statusFilter' => $statusFilter,
            'caisseFilter' => $caisseFilter,
        ]);
    }

    /**
     * Création d'une nouvelle caisse par le Manager Finance.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:cash_registers,name'],
            'code' => ['required', 'string', 'max:50', 'unique:cash_registers,code'],
            'devise' => ['required', 'in:USD,FC'],
            'solde_initial' => ['required', 'numeric', 'min:0'],
            'cashier_ids' => ['nullable', 'array'],
            'cashier_ids.*' => ['exists:users,id'],
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

        return Redirect::back()->with('success', "Caisse {$caisse->name} créée avec succès.");
    }

    /**
     * Mise à jour d'une caisse et de ses caissiers affectés.
     */
    public function update(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);

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
}
