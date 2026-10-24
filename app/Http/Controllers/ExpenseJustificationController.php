<?php

namespace App\Http\Controllers;

use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\ExpenseJustification;
use App\Models\ExpenseJustificationLine;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseJustificationController extends Controller
{
    /**
     * Liste des décharges et formulaires de retour de fonds (Appendice 2).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Réquisitions décaissées disponibles pour justification
        $requisitionsQuery = Requisition::with(['demandes', 'user'])
            ->where('status', 'decaisse')
            ->orderByDesc('date_decaissement');

        if ($user->hasRole('beneficiary') || $user->hasRole('coordinator')) {
            $requisitionsQuery->where('user_id', $user->id);
        } elseif ($user->hasRole('project_manager') && $user->project_id) {
            $requisitionsQuery->where('project_id', $user->project_id);
        }

        $requisitionsADecharger = $requisitionsQuery->get()->map(function (Requisition $r) {
            $bsc = CashMovement::where('requisition_id', $r->id)->where('type', 'sortie')->first();

            return [
                'id' => $r->id,
                'numero' => $r->numero_requisition,
                'projet' => $r->projet,
                'nature' => $r->nature_requisition,
                'montantTotal' => (float) $r->montant_total,
                'devise' => $r->devise,
                'demandeurNom' => $r->user?->name ?? 'Agent',
                'numero_bsc' => $bsc?->numero_piece ?? $r->reference_paiement ?? 'BSC-000',
                'imputation' => $bsc?->imputation ?? $r->demandes->first()?->code_allocation ?? '6.112.a',
            ];
        });

        // Historique des Return Forms / Appendice 2
        $justificationsQuery = ExpenseJustification::with(['requisition', 'user', 'projectManager', 'cashier', 'lines'])
            ->orderByDesc('created_at');

        if ($user->hasRole('beneficiary') || $user->hasRole('coordinator')) {
            $justificationsQuery->where('user_id', $user->id);
        } elseif ($user->hasRole('project_manager') && $user->project_id) {
            $justificationsQuery->whereHas('requisition', fn ($q) => $q->where('project_id', $user->project_id));
        }

        $justifications = $justificationsQuery->get()->map(fn (ExpenseJustification $j) => [
            'id' => $j->id,
            'numero_return_form' => $j->numero_return_form,
            'requisition_numero' => $j->requisition?->numero_requisition ?? '—',
            'demandeur_nom' => $j->user?->name ?? 'Agent',
            'pm_nom' => $j->projectManager?->name,
            'cashier_nom' => $j->cashier?->name,
            'code_activite' => $j->code_activite,
            'imputation' => $j->imputation,
            'reference_bon_sortie' => $j->reference_bon_sortie,
            'montant_recu' => (float) $j->montant_recu,
            'montant_utilise' => (float) $j->montant_utilise,
            'solde' => (float) $j->solde,
            'devise' => $j->devise,
            'status' => $j->status,
            'created_at' => $j->created_at->format('d/m/Y'),
            'lines' => $j->lines->map(fn (ExpenseJustificationLine $l) => [
                'id' => $l->id,
                'date_depense' => $l->date_depense->format('d/m/Y'),
                'description' => $l->description,
                'montant_usd' => (float) $l->montant_usd,
                'montant_cdf' => (float) $l->montant_cdf,
                'remarques' => $l->remarques,
            ]),
        ]);

        return Inertia::render('Staff/Justifications/Index', [
            'requisitionsADecharger' => $requisitionsADecharger,
            'justifications' => $justifications,
        ]);
    }

    /**
     * Enregistre un nouveau formulaire de décharge / Return Form (Appendice 2).
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'requisition_id' => ['required', 'exists:requisitions,id'],
            'reference_bon_sortie' => ['required', 'string', 'max:100'],
            'imputation' => ['required', 'string', 'max:50'],
            'code_activite' => ['nullable', 'string', 'max:100'],
            'devise' => ['required', 'in:USD,FC'],
            'montant_recu' => ['required', 'numeric', 'min:0.01'],
            'lignes' => ['required', 'array', 'min:1'],
            'lignes.*.date_depense' => ['required', 'date'],
            'lignes.*.description' => ['required', 'string', 'max:255'],
            'lignes.*.montant_usd' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.montant_cdf' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.remarques' => ['nullable', 'string', 'max:255'],
        ]);

        $requisition = Requisition::findOrFail($validated['requisition_id']);

        DB::transaction(function () use ($validated, $requisition, $user) {
            $annee = now()->year;
            $count = ExpenseJustification::whereYear('created_at', $annee)->count() + 1;
            $numeroReturn = sprintf('RET-%s-%03d', $annee, $count);

            $totalUtilise = 0.0;
            foreach ($validated['lignes'] as $ligne) {
                $totalUtilise += $validated['devise'] === 'FC'
                    ? (float) ($ligne['montant_cdf'] ?? 0)
                    : (float) ($ligne['montant_usd'] ?? 0);
            }

            $montantRecu = (float) $validated['montant_recu'];
            $solde = round($montantRecu - $totalUtilise, 2);

            $justification = ExpenseJustification::create([
                'requisition_id' => $requisition->id,
                'user_id' => $user->id,
                'numero_return_form' => $numeroReturn,
                'code_activite' => $validated['code_activite'] ?? null,
                'imputation' => trim($validated['imputation']),
                'reference_bon_sortie' => trim($validated['reference_bon_sortie']),
                'montant_recu' => $montantRecu,
                'montant_utilise' => $totalUtilise,
                'solde' => $solde,
                'devise' => $validated['devise'],
                'status' => 'brouillon',
            ]);

            foreach ($validated['lignes'] as $ligne) {
                ExpenseJustificationLine::create([
                    'justification_id' => $justification->id,
                    'date_depense' => $ligne['date_depense'],
                    'description' => trim($ligne['description']),
                    'montant_usd' => (float) ($ligne['montant_usd'] ?? 0),
                    'montant_cdf' => (float) ($ligne['montant_cdf'] ?? 0),
                    'remarques' => $ligne['remarques'] ?? null,
                ]);
            }

            $this->notifierRole(
                roleCible: 'project_manager',
                projectId: $requisition->project_id,
                titre: 'Décharge à viser (Return Form)',
                message: "L'agent {$user->name} a déposé la décharge {$numeroReturn} (Cfr BSC {$validated['reference_bon_sortie']}). Visa MP requis."
            );
        });

        return Redirect::back()->with('success', 'Formulaire de décharge enregistré avec succès.');
    }

    /**
     * Le Project Manager vise le Return Form avec son Code PIN.
     */
    public function visaMP(Request $request, ExpenseJustification $justification): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('project_manager') || $user->hasRole('admin'), 403, 'Action réservée au Manager de Projet.');

        $validated = $request->validate([
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Le code PIN personnel est strictement obligatoire.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN personnel incorrect.']);
        }

        $justification->update([
            'project_manager_id' => $user->id,
            'status' => 'valide_mp',
        ]);

        $this->notifierRole(
            roleCible: 'cashier',
            projectId: null,
            titre: 'Décharge visée prête pour apurement',
            message: "La décharge {$justification->numero_return_form} a été visée par le MP. Solde à constater : {$justification->solde} {$justification->devise}."
        );

        return Redirect::back()->with('success', "Visa MP accordé sur la décharge {$justification->numero_return_form}.");
    }

    /**
     * Le Caissier apure la décharge avec son Code PIN.
     * Si le solde > 0, un Bon d'Entrée Caisse (BEC) de retour de fonds est automatiquement généré.
     */
    public function apurerCaissier(Request $request, ExpenseJustification $justification): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('cashier') || $user->hasRole('admin'), 403, 'Action réservée au caissier.');
        abort_unless($justification->status === 'valide_mp', 400, 'Cette décharge doit d’abord recevoir le visa du Chef de Projet.');

        $validated = $request->validate([
            'pin' => ['required', 'string', 'digits_between:4,6'],
        ], [
            'pin.required' => 'Le code PIN caissier est strictement obligatoire.',
        ]);

        if (empty($user->signature_pin) || ! Hash::check($validated['pin'], $user->signature_pin)) {
            return Redirect::back()->withErrors(['pin' => 'Code PIN caissier incorrect.']);
        }

        DB::transaction(function () use ($justification, $user) {
            $now = now();

            // Si un solde positif reste, émission automatique d'un Bon d'Entrée Caisse (Photo 1)
            if ($justification->solde > 0) {
                $caisse = CashRegister::where('name', $justification->requisition?->caisse_decaissement)->first() ?? CashRegister::first();
                $session = $caisse?->activeSession;

                $annee = $now->year;
                $count = CashMovement::whereYear('created_at', $annee)->where('type', 'entree')->count() + 1;
                $numeroPiece = sprintf('BEC-%s-%03d', $annee, $count);

                CashMovement::create([
                    'cash_register_id' => $caisse?->id,
                    'session_id' => $session?->id,
                    'cashier_id' => $user->id,
                    'requisition_id' => $justification->requisition_id,
                    'type' => 'entree',
                    'numero_piece' => $numeroPiece,
                    'date_mouvement' => $now->toDateString(),
                    'tiers_nom' => $justification->user?->name ?? 'Agent',
                    'montant' => (float) $justification->solde,
                    'devise' => $justification->devise,
                    'montant_en_lettres' => "Retour de fonds suite au solde décharge {$justification->numero_return_form}",
                    'motif' => "Retour en caisse Cfr B.S.C. N° {$justification->reference_bon_sortie}",
                    'imputation' => $justification->imputation,
                    'mode_paiement' => 'Espèces',
                    'reference_externe' => $justification->reference_bon_sortie,
                    'signature_tiers' => $justification->user?->name,
                    'signature_caissier' => $user->name,
                ]);

                if ($caisse) {
                    $caisse->increment('solde_actuel', $justification->solde);
                }
                if ($session) {
                    $session->increment('total_entrees', $justification->solde);
                }
            }

            $justification->update([
                'cashier_id' => $user->id,
                'status' => 'apure',
                'apure_at' => $now,
            ]);

            // Clôture définitive du cycle de la réquisition
            $justification->requisition?->update([
                'status' => 'cloture',
            ]);

            $this->notifierUtilisateur(
                userId: $justification->user_id,
                titre: 'Décharge apurée & Dossier clôturé',
                message: "Votre décharge {$justification->numero_return_form} a été apurée au guichet. La réquisition {$justification->requisition?->numero_requisition} est officiellement clôturée."
            );
        });

        return Redirect::back()->with('success', 'Décharge apurée avec succès. Cycle de dépense définitivement clôturé.');
    }

    protected function notifierRole(string $roleCible, ?string $projectId, string $titre, string $message): void
    {
        $query = User::role($roleCible);
        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $users = $query->get();
        if ($users->isEmpty() && $roleCible === 'project_manager') {
            $users = User::role('project_manager')->get();
        }

        foreach ($users as $u) {
            $this->notifierUtilisateur($u->id, $titre, $message);
        }
    }

    protected function notifierUtilisateur(string $userId, string $titre, string $message): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\RequisitionWorkflowNotification',
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $userId,
            'data' => json_encode([
                'titre' => $titre,
                'message' => $message,
                'urgent' => false,
                'date' => now()->format('d/m/Y H:i'),
            ]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
