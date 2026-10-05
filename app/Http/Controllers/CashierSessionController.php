<?php

namespace App\Http\Controllers;

use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;

class CashierSessionController extends Controller
{
    /**
     * Le caissier demande l'ouverture de son guichet pour la journée (Fond de caisse initial).
     */
    public function requestOpening(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $isAssigned = $cashRegister->cashiers()->where('users.id', $user->id)->exists() || $user->hasRole('admin');
        abort_unless($isAssigned, 403, 'Vous n’êtes pas affecté à cette caisse.');

        $activeSession = CashRegisterSession::where('cash_register_id', $cashRegister->id)
            ->whereIn('status', ['ouverte', 'en_attente_autorisation'])
            ->whereDate('date_session', now()->toDateString())
            ->first();

        if ($activeSession) {
            return Redirect::back()->with('error', 'Une session est déjà active ou en attente pour ce guichet aujourd’hui.');
        }

        $validated = $request->validate([
            'solde_ouverture' => ['required', 'numeric', 'min:0'],
            'observation' => ['nullable', 'string', 'max:500'],
        ]);

        $session = CashRegisterSession::create([
            'cash_register_id' => $cashRegister->id,
            'cashier_id' => $user->id,
            'date_session' => now()->toDateString(),
            'solde_ouverture' => (float) $validated['solde_ouverture'],
            'status' => 'en_attente_autorisation',
            'observation_ouverture' => $validated['observation'] ?? 'Demande d’ouverture de guichet.',
        ]);

        $this->notifierRole(
            roleCible: 'finance',
            titre: 'Alerte : Demande d’ouverture de Caisse',
            message: "Le caissier {$user->name} demande l’ouverture du guichet {$cashRegister->name} (Fond initial : {$session->solde_ouverture} {$cashRegister->devise}). Autorisation requise.",
            urgent: true
        );

        return Redirect::back()->with('success', "Demande d’ouverture transmise au Manager Finance pour la caisse {$cashRegister->name}.");
    }

    /**
     * Le Manager Finance autorise l'ouverture du guichet avec son Code PIN.
     */
    public function authorizeOpening(Request $request, CashRegisterSession $session): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Action réservée à la Direction Financière.');
        abort_unless($session->status === 'en_attente_autorisation', 400, 'Cette session n’est pas en attente d’autorisation.');

        $validated = $request->validate([
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Votre Code PIN financier est obligatoire pour autoriser l’ouverture.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN financier incorrect ou non configuré.']);
        }

        DB::transaction(function () use ($session, $user) {
            $now = now();
            $session->update([
                'status' => 'ouverte',
                'authorized_by' => $user->id,
                'opened_at' => $now,
            ]);

            $session->cashRegister->update([
                'solde_actuel' => $session->solde_ouverture,
            ]);

            $this->notifierUtilisateur(
                userId: $session->cashier_id,
                titre: 'Guichet Autorisé & Ouvert',
                message: "Le Manager Finance ({$user->name}) a autorisé l’ouverture de votre caisse {$session->cashRegister->name}. Le guichet est opérationnel."
            );
        });

        return Redirect::back()->with('success', "Guichet {$session->cashRegister->name} ouvert avec succès.");
    }

    /**
     * Le caissier clôture son guichet en fin de journée (Comptage de caisse final).
     */
    public function closeSession(Request $request, CashRegisterSession $session): RedirectResponse
    {
        $user = $request->user();
        $isAuthorized = ($session->cashier_id === $user->id) || $user->hasRole('admin');
        abort_unless($isAuthorized, 403, 'Vous ne pouvez clôturer que votre propre session de caisse.');
        abort_unless($session->status === 'ouverte', 400, 'Cette session n’est pas ouverte.');

        $validated = $request->validate([
            'solde_fermeture' => ['required', 'numeric', 'min:0'],
            'observation' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($session, $validated) {
            $now = now();
            $soldeReel = (float) $validated['solde_fermeture'];

            $session->update([
                'status' => 'fermee',
                'solde_fermeture' => $soldeReel,
                'closed_at' => $now,
                'observation_cloture' => $validated['observation'] ?? 'Clôture normale en fin de journée.',
            ]);

            $session->cashRegister->update([
                'solde_actuel' => $soldeReel,
            ]);

            $this->notifierRole(
                roleCible: 'finance',
                titre: 'Guichet Caisse Clôturé',
                message: "La session de caisse {$session->cashRegister->name} a été clôturée par le caissier. Solde final : {$soldeReel} {$session->cashRegister->devise}."
            );
        });

        return Redirect::back()->with('success', "Session de caisse {$session->cashRegister->name} clôturée.");
    }

    /**
     * Enregistre un Bon d'Entrée Caisse (Approvisionnement ou Retour de fonds suite à Return Form / Photo 1).
     */
    public function storeEntree(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $activeSession = $cashRegister->activeSession;
        if (! $activeSession || $activeSession->status !== 'ouverte') {
            return Redirect::back()->with('error', 'Opération impossible : cette caisse n’a pas de session ouverte aujourd’hui.');
        }

        $validated = $request->validate([
            'tiers_nom' => ['required', 'string', 'max:255'],
            'montant' => ['required', 'numeric', 'min:0.01'],
            'devise' => ['required', 'in:USD,FC'],
            'montant_en_lettres' => ['required', 'string', 'max:500'],
            'motif' => ['required', 'string', 'max:255'],
            'imputation' => ['required', 'string', 'max:100'],
            'mode_paiement' => ['required', 'string', 'in:Espèces,Chèque,Virement bancaire,Airtel Money,M-Pesa,Orange Money'],
            'reference_externe' => ['nullable', 'string', 'max:255'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Le code PIN caissier est strictement obligatoire.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN caissier incorrect ou non configuré.']);
        }

        DB::transaction(function () use ($validated, $cashRegister, $activeSession, $user) {
            $annee = now()->year;
            $count = CashMovement::whereYear('created_at', $annee)->where('type', 'entree')->count() + 1;
            $numeroPiece = sprintf('BEC-%s-%03d', $annee, $count);

            $montant = (float) $validated['montant'];

            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'session_id' => $activeSession->id,
                'cashier_id' => $user->id,
                'type' => 'entree',
                'numero_piece' => $numeroPiece,
                'date_mouvement' => now()->toDateString(),
                'tiers_nom' => trim($validated['tiers_nom']),
                'montant' => $montant,
                'devise' => $validated['devise'],
                'montant_en_lettres' => trim($validated['montant_en_lettres']),
                'motif' => trim($validated['motif']),
                'imputation' => trim($validated['imputation']),
                'mode_paiement' => $validated['mode_paiement'],
                'reference_externe' => $validated['reference_externe'] ?? null,
                'signature_tiers' => trim($validated['tiers_nom']),
                'signature_caissier' => $user->name,
            ]);

            $cashRegister->increment('solde_actuel', $montant);
            $activeSession->increment('total_entrees', $montant);
        });

        return Redirect::back()->with('success', "Bon d'Entrée Caisse enregistré avec succès.");
    }

    protected function notifierRole(string $roleCible, string $titre, string $message, bool $urgent = false): void
    {
        $users = User::role($roleCible)->get();
        foreach ($users as $u) {
            $this->notifierUtilisateur($u->id, $titre, $message, $urgent);
        }
    }

    protected function notifierUtilisateur(string $userId, string $titre, string $message, bool $urgent = false): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\RequisitionWorkflowNotification',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $userId,
            'data' => json_encode([
                'titre' => $titre,
                'message' => $message,
                'urgent' => $urgent,
                'date' => now()->format('d/m/Y H:i'),
            ]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}