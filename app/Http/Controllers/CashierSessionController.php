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
     * Demande d'ouverture de guichet.
     * Le solde d'ouverture est hérité de la dernière clôture ou de la dotation.
     * Accessible dès qu'aucune session active n'est en cours.
     */
    public function requestOpening(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $isAssigned = $cashRegister->cashiers()->where('users.id', $user->id)->exists() || $user->hasRole('admin');
        abort_unless($isAssigned, 403, 'Vous n’êtes pas affecté à ce guichet.');

        $activeSession = CashRegisterSession::where('cash_register_id', $cashRegister->id)
            ->whereIn('status', ['ouverte', 'en_attente_autorisation'])
            ->first();

        if ($activeSession) {
            return Redirect::back()->with('error', 'Une session est déjà ouverte ou en attente d’autorisation pour ce guichet.');
        }

        $validated = $request->validate([
            'observation' => ['nullable', 'string', 'max:500'],
        ]);

        $lastClosed = $cashRegister->lastClosedSession;

        if ($lastClosed) {
            $soldeOuverture = (float) ($lastClosed->solde_fermeture ?? 0.0);
            $origine = 'report_veille';
            $previousSessionId = $lastClosed->id;
            $approvMovementId = null;
        } else {
            if (! $cashRegister->is_approvisionnee) {
                return Redirect::back()->with(
                    'error',
                    'Impossible d’ouvrir le guichet : Aucun fond de dotation initial n’a été validé par le Manager Finance. ' .
                    'Veuillez d’abord enregistrer un Bon d’Entrée Caisse d’approvisionnement initial avec preuve bancaire.'
                );
            }

            $initialBEC = $cashRegister->initialDotationMovement;
            $soldeOuverture = (float) ($initialBEC?->montant ?? $cashRegister->solde_initial_dotation ?? $cashRegister->solde_actuel ?? 0.0);
            $origine = 'approvisionnement_initial';
            $previousSessionId = null;
            $approvMovementId = $initialBEC?->id;
        }

        $session = CashRegisterSession::create([
            'cash_register_id' => $cashRegister->id,
            'cashier_id' => $user->id,
            'previous_session_id' => $previousSessionId,
            'origine_ouverture' => $origine,
            'approvisionnement_movement_id' => $approvMovementId,
            'date_session' => now()->toDateString(),
            'solde_ouverture' => max(0.0, $soldeOuverture),
            'status' => 'en_attente_autorisation',
            'observation_ouverture' => $validated['observation'] ?? ($origine === 'report_veille'
                ? "Ouverture par report automatique de la clôture précédente (" . number_format($soldeOuverture, 2, ',', ' ') . " {$cashRegister->devise})."
                : "Ouverture par dotation initiale validée (" . number_format($soldeOuverture, 2, ',', ' ') . " {$cashRegister->devise})."),
        ]);

        $this->notifierRole(
            roleCible: 'finance',
            titre: 'Alerte : Demande d’Ouverture de Guichet',
            message: "Le caissier {$user->name} demande l’ouverture du guichet {$cashRegister->name} " .
                     "(Fond calculé : " . number_format($session->solde_ouverture, 2, ',', ' ') . " {$cashRegister->devise} " .
                     "via {$origine}). Autorisation par PIN requise.",
            urgent: true
        );

        return Redirect::back()->with(
            'success',
            "Demande d’ouverture transmise au Manager Finance. Fond d'ouverture : " .
            number_format($session->solde_ouverture, 2, ',', ' ') . " {$cashRegister->devise}."
        );
    }

    /**
     * Autorisation d'ouverture par le Manager Finance (PIN).
     */
    public function authorizeOpening(Request $request, CashRegisterSession $session): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);
        abort_unless($session->status === 'en_attente_autorisation', 400);

        $validated = $request->validate([
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN financier incorrect ou non configuré.']);
        }

        DB::transaction(function () use ($session, $user) {
            $soldeOuv = max(0.0, (float) ($session->solde_ouverture ?? 0.0));

            $session->update([
                'status' => 'ouverte',
                'solde_ouverture' => $soldeOuv,
                'authorized_by' => $user->id,
                'opened_at' => now(),
            ]);

            // Mise à jour de la caisse garantie sans valeur NULL
            $session->cashRegister->update([
                'solde_actuel' => $soldeOuv,
            ]);

            $this->notifierUtilisateur(
                userId: $session->cashier_id,
                titre: 'Guichet Autorisé & Ouvert',
                message: "Le Manager Finance ({$user->name}) a validé l’ouverture de votre caisse {$session->cashRegister->name}."
            );
        });

        return Redirect::back()->with('success', "Guichet {$session->cashRegister->name} ouvert avec succès.");
    }

    /**
     * Clôture avec rapprochement physique vs théorique.
     */
    public function closeSession(Request $request, CashRegisterSession $session): RedirectResponse
    {
        $user = $request->user();
        abort_unless(($session->cashier_id === $user->id) || $user->hasRole('admin'), 403);
        abort_unless($session->status === 'ouverte', 400);

        $validated = $request->validate([
            'solde_fermeture' => ['required', 'numeric', 'min:0'],
            'justification_ecart' => ['nullable', 'string', 'max:1000'],
            'observation' => ['nullable', 'string', 'max:500'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN caissier incorrect ou non configuré.']);
        }

        $totalEntrees = (float) $session->movements()->where('type', 'entree')->where('status_validation', 'valide')->sum('montant');
        $totalSorties = (float) $session->movements()->where('type', 'sortie')->sum('montant');
        $soldeTheorique = round((float) ($session->solde_ouverture ?? 0.0) + $totalEntrees - $totalSorties, 2);

        $soldePhysique = round((float) $validated['solde_fermeture'], 2);
        $ecart = round($soldePhysique - $soldeTheorique, 2);

        if ($ecart !== 0.0 && empty(trim((string) ($validated['justification_ecart'] ?? '')))) {
            return Redirect::back()->withErrors([
                'justification_ecart' => "Un écart de caisse de " . number_format($ecart, 2, ',', ' ') . " " .
                    $session->cashRegister->devise . " a été constaté. Vous devez obligatoirement en préciser le motif pour clôturer.",
            ]);
        }

        DB::transaction(function () use ($session, $validated, $soldeTheorique, $soldePhysique, $ecart, $totalEntrees, $totalSorties) {
            $session->update([
                'status' => 'fermee',
                'total_entrees' => $totalEntrees,
                'total_sorties' => $totalSorties,
                'solde_theorique_cloture' => $soldeTheorique,
                'solde_fermeture' => $soldePhysique,
                'ecart_caisse' => $ecart,
                'justification_ecart' => $ecart !== 0.0 ? trim($validated['justification_ecart']) : null,
                'closed_at' => now(),
                'observation_cloture' => $validated['observation'] ?? 'Arrêté de caisse journalier effectué.',
            ]);

            // Mise à jour physique de la caisse
            $session->cashRegister->update([
                'solde_actuel' => max(0.0, $soldePhysique),
            ]);

            if ($ecart !== 0.0) {
                $this->notifierRole(
                    roleCible: 'finance',
                    titre: '⚠️ ALERTE : Écart de Caisse Constaté',
                    message: "Le guichet {$session->cashRegister->name} a été clôturé avec un écart de " .
                             number_format($ecart, 2, ',', ' ') . " {$session->cashRegister->devise}. " .
                             "Justification : {$validated['justification_ecart']}",
                    urgent: true
                );
            }
        });

        return Redirect::back()->with(
            'success',
            $ecart === 0.0
                ? "Session clôturée avec succès. Caisse parfaitement conforme."
                : "Session clôturée. Écart consigné et transmis à la Finance."
        );
    }

    /**
     * Enregistre un Bon d'Entrée Caisse (BEC).
     */
    public function storeEntree(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403);

        $isInitialDotation = $request->boolean('is_approvisionnement_initial');
        $isApprovisionnement = $isInitialDotation || $request->boolean('is_approvisionnement');

        $activeSession = $cashRegister->activeSession;

        if (! $isInitialDotation && (! $activeSession || $activeSession->status !== 'ouverte')) {
            return Redirect::back()->with('error', 'Opération impossible : cette caisse n’a pas de session ouverte aujourd’hui.');
        }

        $rules = [
            'tiers_nom' => ['required', 'string', 'max:255'],
            'montant' => ['required', 'numeric', 'min:0.01'],
            'devise' => ['required', 'string'],
            'montant_en_lettres' => ['required', 'string', 'max:500'],
            'motif' => ['required', 'string', 'max:255'],
            'imputation' => ['required', 'string', 'max:100'],
            'mode_paiement' => ['required', 'string'],
            'reference_externe' => ['nullable', 'string', 'max:255'],
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ];

        if ($isApprovisionnement) {
            $rules['bordereau_banque_ref'] = ['required', 'string', 'max:100'];
            $rules['bordereau_file'] = ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];
            $rules['billetage'] = ['nullable', 'array'];
        }

        $validated = $request->validate($rules);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN caissier incorrect ou non configuré.']);
        }

        DB::transaction(function () use ($validated, $cashRegister, $activeSession, $user, $isInitialDotation, $isApprovisionnement, $request) {
            $annee = now()->year;
            $count = CashMovement::whereYear('created_at', $annee)->where('type', 'entree')->count() + 1;
            $numeroPiece = sprintf('BEC-%s-%03d', $annee, $count);
            $montant = (float) $validated['montant'];

            $bordereauPath = $request->hasFile('bordereau_file')
                ? $request->file('bordereau_file')->store('bordereaux-caisses', 'public')
                : null;

            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'session_id' => $activeSession?->id,
                'cashier_id' => $user->id,
                'type' => 'entree',
                'is_approvisionnement_initial' => $isInitialDotation,
                'is_approvisionnement' => $isApprovisionnement,
                'status_validation' => $isInitialDotation ? 'en_attente_finance' : 'valide',
                'pin_validated' => ! $isInitialDotation,
                'numero_piece' => $numeroPiece,
                'date_mouvement' => now()->toDateString(),
                'tiers_nom' => trim($validated['tiers_nom']),
                'montant' => $montant,
                'devise' => $cashRegister->devise,
                'montant_en_lettres' => trim($validated['montant_en_lettres']),
                'motif' => trim($validated['motif']),
                'imputation' => trim($validated['imputation']),
                'mode_paiement' => $validated['mode_paiement'],
                'reference_externe' => $validated['reference_externe'] ?? null,
                'bordereau_banque_ref' => $validated['bordereau_banque_ref'] ?? null,
                'bordereau_file_path' => $bordereauPath,
                'billetage' => $validated['billetage'] ?? null,
                'signature_tiers' => trim($validated['tiers_nom']),
                'signature_caissier' => $user->name,
            ]);

            if (! $isInitialDotation && $activeSession) {
                $cashRegister->increment('solde_actuel', $montant);
                $activeSession->increment('total_entrees', $montant);
            }
        });

        return Redirect::back()->with('success', "Bon d'Entrée Caisse enregistré avec succès.");
    }

    /**
     * Validation de la dotation initiale par le MF avec son PIN.
     */
    public function validateApprovisionnement(Request $request, CashMovement $movement): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403);
        abort_unless($movement->status_validation === 'en_attente_finance', 400);

        $validated = $request->validate([
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN financier incorrect.']);
        }

        DB::transaction(function () use ($movement, $user) {
            $caisse = $movement->cashRegister;
            $montant = (float) $movement->montant;

            $movement->update([
                'status_validation' => 'valide',
                'validated_by' => $user->id,
                'validated_at' => now(),
                'pin_validated' => true,
            ]);

            $caisse->update([
                'is_approvisionnee' => true,
                'solde_initial_dotation' => $montant,
                'solde_actuel' => $montant,
            ]);
        });

        return Redirect::back()->with('success', "Dotation initiale validée avec succès.");
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
            'data' => json_encode(['titre' => $titre, 'message' => $message, 'urgent' => $urgent, 'date' => now()->format('d/m/Y H:i')]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}