<?php

namespace App\Http\Controllers;

use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RequisitionController extends Controller
{
    public function index()
    {
        $requisitions = Requisition::with(['demandes.justificatifs', 'signatures.user', 'project'])
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Requisition $requisition) {
                return [
                    'id' => $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'project_id' => $requisition->project_id,
                    'site' => $requisition->project_code ?? '',
                    'nature' => $requisition->nature_requisition,
                    'caisse' => $requisition->caisse_decaissement ?? 'Caisse principale',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'montantLettres' => '',
                    'dateSoumission' => $requisition->created_at?->format('d/m/Y') ?? '',
                    'is_urgent' => (bool) $requisition->is_urgent,
                    'date_paiement' => $requisition->date_paiement?->format('d/m/Y'),
                    'date_livraison' => $requisition->date_livraison?->format('d/m/Y'),
                    'observation' => $requisition->observation,
                    'etapeActuelle' => $this->mapStatusToWorkflow($requisition->status),

                    'signatures' => $requisition->signatures->map(function (RequisitionSignature $sig) {
                        return [
                            'role' => $sig->role_signataire,
                            'nom' => $sig->nom_signataire,
                            'action' => $sig->action,
                            'code' => $sig->signature_code ?: 'BP-SIG-VAL',
                            'date' => $sig->signed_at->format('d/m/Y à H:i'),
                            'hash' => $sig->signature_hash,
                            'hashShort' => substr($sig->signature_hash, 0, 16) . '...',
                        ];
                    })->values()->all(),

                    'articles' => $requisition->demandes->map(function (Demande $demande) {
                        $justificatifs = $demande->justificatifs()->get();

                        return [
                            'id' => $demande->id,
                            'activite' => $demande->activite,
                            'codeActivite' => $demande->nature ?? '',
                            'codeAllocation' => $demande->code_allocation ?? $demande->code_all_budget,
                            'nature' => $demande->nature ?? 'Achat',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?? '',
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'justificatifsCount' => $justificatifs->count(),
                            'justificatifs' => $justificatifs->map(function ($justificatif) {
                                return [
                                    'id' => (string) $justificatif->id,
                                    'description' => $justificatif->description ?? $justificatif->original_name,
                                    'originalName' => $justificatif->original_name,
                                    'date' => $justificatif->date ?? now()->toDateString(),
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'fileUrl' => $justificatif->file_path ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id]) : null,
                                ];
                            })->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })->all();

        return Inertia::render('Staff/Requisitions/Index', [
            'requisitions' => $requisitions,
        ]);
    }

    public function showJustificatif(DemandeJustificatif $justificatif)
    {
        $user = Auth::user();
        if (! $user) abort(403);

        $requisition = $justificatif->demande?->requisition;
        $isAuthorized = $requisition?->user_id === $user->id
            || $user->hasRole('admin')
            || ($user->hasRole('project_manager') && $user->project_id !== null && $user->project_id === $requisition?->project_id)
            || $user->hasRole('finance')
            || $user->hasRole('admin_manager')
            || $user->hasRole('director');

        if (! $isAuthorized) abort(403, 'Vous n’êtes pas autorisé à consulter ce fichier.');
        if (empty($justificatif->file_path) || ! Storage::disk('public')->exists($justificatif->file_path)) {
            abort(404, 'Fichier introuvable.');
        }

        $absolutePath = Storage::disk('public')->path($justificatif->file_path);

        return response()->file($absolutePath, [
            'Content-Type' => $justificatif->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($justificatif->original_name ?: basename($absolutePath)) . '"',
        ]);
    }

    public function update(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        $isOwner = $requisition->user_id === $user->id;
        $isProjectManagerForProject = $user->hasRole('project_manager')
            && $user->project_id !== null
            && $user->project_id === $requisition->project_id;
        $isFinanceReturned = $requisition->status === 'draft'
            && str_contains($requisition->observation ?? '', 'Motif rejet Finance:');

        $mayEdit = ($isOwner && $requisition->status === 'draft')
            || ($isProjectManagerForProject && $isOwner && in_array($requisition->status, ['draft', 'visa_mp'], true))
            || ($isProjectManagerForProject && $isFinanceReturned);

        abort_unless($mayEdit, 403, 'Vous n’êtes pas autorisé à modifier cette réquisition.');

        $validated = $request->validate([
            'nature_requisition' => ['sometimes', 'in:Achat,Service'],
            'caisse_decaissement' => ['required', 'string', 'max:255'],
            'devise' => ['required', 'in:USD,FC,EUR'],
            'observation' => ['nullable', 'string'],
            'articles' => ['required', 'array', 'min:1'],
            'articles.*.id' => ['required', 'string', 'distinct'],
            'articles.*.activite' => ['required', 'string', 'max:255'],
            'articles.*.code_all_budget' => ['nullable', 'string', 'max:255'],
            'articles.*.nature' => ['nullable', 'string'],
            'articles.*.quantiteOuDuree' => ['required', 'numeric', 'min:0'],
            'articles.*.unite' => ['nullable', 'string', 'max:255'],
            'articles.*.prixUnitaire' => ['required', 'numeric', 'min:0'],
        ]);

        $natureRequisition = $validated['nature_requisition'] ?? $requisition->nature_requisition;

        DB::transaction(function () use ($validated, $requisition, $natureRequisition, $isProjectManagerForProject, $isFinanceReturned) {
            $demandes = $requisition->demandes()->get()->keyBy('id');
            $montantTotal = 0;
            $observation = $validated['observation'] ?? null;

            if ($isFinanceReturned) {
                $observation = trim(($observation ? $observation . PHP_EOL : '') . 'Correction apportée par le Manager le ' . now()->format('d/m/Y H:i'));
            }

            foreach ($validated['articles'] as $article) {
                $demande = $demandes->get($article['id']);
                if (! $demande) continue;

                $quantiteOuDuree = (float) $article['quantiteOuDuree'];
                $fraisUnitaire = (float) $article['prixUnitaire'];
                $totalLigne = round($quantiteOuDuree * $fraisUnitaire, 2);
                $isService = strtolower($natureRequisition) === 'service';

                $demande->update([
                    'activite' => $article['activite'],
                    'code_all_budget' => $article['code_all_budget'] ?? $demande->code_all_budget,
                    'nature' => $article['nature'] ?? $demande->nature,
                    'quantite' => $isService ? 0 : $quantiteOuDuree,
                    'duree' => $isService ? $quantiteOuDuree : 0,
                    'unite' => $article['unite'] ?? $demande->unite,
                    'frais_unitaire' => $fraisUnitaire,
                    'total_ligne' => $totalLigne,
                ]);

                $montantTotal += $totalLigne;
            }

            $newStatus = ($isProjectManagerForProject && $isFinanceReturned) ? 'visa_mp' : $requisition->status;

            $requisition->update([
                'caisse_decaissement' => $validated['caisse_decaissement'],
                'nature_requisition' => $natureRequisition,
                'devise' => $validated['devise'],
                'observation' => $observation,
                'montant_total' => round($montantTotal, 2),
                'status' => $newStatus,
            ]);
        });

        return Redirect::back()->with('success', 'Réquisition modifiée avec succès.');
    }

    /**
     * CRÉATION RÉELLE AVEC NOTIFICATION BILATÉRALE (INITIATEUR + VALIDATEUR).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nature_requisition' => ['required', 'in:Achat,Service'],
            'projet' => ['required', 'string', 'exists:projects,name'],
            'project_code' => ['nullable', 'string'],
            'caisse_decaissement' => ['nullable', 'string'],
            'devise' => ['required', 'in:USD,FC,EUR'],
            'observation' => ['nullable', 'string'],
            'montant_total' => ['required', 'numeric', 'min:0'],
            'is_urgent' => ['sometimes', 'boolean'],
            'date_paiement' => ['nullable', 'date'],
            'date_livraison' => ['nullable', 'date'],
            'lignes' => ['required', 'array', 'min:1'],
            'lignes.*.activite' => ['required', 'string', 'max:255'],
            'lignes.*.code_activite' => ['nullable', 'string', 'max:100'],
            'lignes.*.quantite' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.duree' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.unite' => ['nullable', 'string', 'max:50'],
            'lignes.*.frais_unitaire' => ['required', 'numeric', 'min:0'],
            'lignes.*.total_ligne' => ['required', 'numeric', 'min:0'],
            'lignes.*.justificatifs' => ['nullable', 'array'],
        ]);

        $project = Project::where('name', $validated['projet'])->firstOrFail();
        $user = $request->user();

        if ($user->hasRole('project_manager')) {
            abort_unless($user->project_id !== null && $user->project_id === $project->id, 403, 'Vous ne pouvez créer une réquisition que pour votre projet.');
        }

        // Calcul du numéro chronologique officiel (ex: CH/09/001)
        $initialesProjet = strtoupper(substr($project->name, 0, 2));
        $moisCourant = now()->format('m');
        $anneeCourante = now()->year;

        $ordre = Requisition::where('project_id', $project->id)
            ->whereYear('created_at', $anneeCourante)
            ->whereMonth('created_at', now()->month)
            ->count() + 1;

        $numeroChronologique = sprintf('%s/%s/%03d', $initialesProjet, $moisCourant, $ordre);

        $isUrgent = $request->boolean('is_urgent');
        $initialStatus = $isUrgent ? 'urgent_direction' : ($user->hasRole('project_manager') ? 'visa_mp' : 'draft');

        $requisition = Requisition::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'numero_requisition' => $numeroChronologique,
            'nature_requisition' => $validated['nature_requisition'],
            'projet' => $validated['projet'],
            'project_code' => $initialesProjet,
            'caisse_decaissement' => $validated['caisse_decaissement'] ?? 'Caisse principale',
            'devise' => $validated['devise'],
            'observation' => $validated['observation'] ?? null,
            'montant_total' => $validated['montant_total'],
            'is_urgent' => $isUrgent,
            'date_paiement' => $validated['date_paiement'] ?? null,
            'date_livraison' => $validated['date_livraison'] ?? null,
            'status' => $initialStatus,
        ]);

        // Signature initiateur
        $this->enregistrerSignature(
            $requisition,
            $user,
            'initiateur',
            'submitted',
            $isUrgent ? 'Soumission URGENTE' : 'Soumission initiale'
        );

        // 1. Notification pour l'initiateur lui-même (Confirmation instantanée)
        $this->notifierUtilisateur(
            userId: $user->id,
            titre: 'Réquisition transmise',
            message: "Votre réquisition {$numeroChronologique} a été transmise avec succès au Manager de Projet.",
            urgent: $isUrgent
        );

        // 2. Notification pour le Manager de Projet (Destinataire d'action)
        $this->notifierRole(
            roleCible: 'project_manager',
            projectId: $project->id,
            titre: $isUrgent ? 'URGENT : Réquisition à viser' : 'Nouvelle réquisition à viser',
            message: "La réquisition {$numeroChronologique} ({$requisition->montant_total} {$requisition->devise}) de {$user->name} attend votre visa.",
            urgent: $isUrgent
        );

        foreach ($request->input('lignes', []) as $ligneIndex => $ligne) {
            $demande = Demande::create([
                'requisition_id' => $requisition->id,
                'activite' => $ligne['activite'],
                'code_all_budget' => '',
                'code_allocation' => null,
                'nature' => $ligne['code_activite'] ?? null,
                'quantite' => $ligne['quantite'] ?? 0,
                'duree' => $ligne['duree'] ?? 0,
                'unite' => $ligne['unite'] ?? null,
                'frais_unitaire' => $ligne['frais_unitaire'],
                'total_ligne' => $ligne['total_ligne'],
            ]);

            $rawJustificatifs = $request->input("lignes.{$ligneIndex}.justificatifs", []);
            $uploadedJustificatifs = $request->file("lignes.{$ligneIndex}.justificatifs", []);

            if (! is_array($rawJustificatifs)) $rawJustificatifs = [$rawJustificatifs];
            if (! is_array($uploadedJustificatifs)) $uploadedJustificatifs = [$uploadedJustificatifs];

            foreach ($rawJustificatifs as $justifIndex => $justifData) {
                $uploadedFile = $uploadedJustificatifs[$justifIndex]['file'] ?? ($uploadedJustificatifs[$justifIndex] ?? null);

                if (! $uploadedFile || ! $uploadedFile instanceof \Illuminate\Http\UploadedFile || ! $uploadedFile->isValid()) {
                    continue;
                }

                $fileMeta = is_array($justifData) ? $justifData : [];
                $path = $uploadedFile->store('requisition-attachments', 'public');

                DemandeJustificatif::create([
                    'demande_id' => $demande->id,
                    'description' => $fileMeta['description'] ?? $uploadedFile->getClientOriginalName(),
                    'date' => $fileMeta['date'] ?? now()->toDateString(),
                    'montant' => (float) ($fileMeta['montant'] ?? 0),
                    'file_path' => $path,
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'mime_type' => $uploadedFile->getClientMimeType(),
                ]);
            }
        }

        return Redirect::route('dashboard')->with('success', "Réquisition {$numeroChronologique} enregistrée avec succès.");
    }

    /**
     * DÉCISION DU MANAGER DE PROJET AVEC NOTIFICATION BILATÉRALE.
     */
    public function managerDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('project_manager'), 403, 'Action réservée au Manager de Projet.');
        abort_unless($user->project_id !== null && $user->project_id === $requisition->project_id, 403, 'Cette réquisition appartient à un autre projet.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'password' => ['required_if:decision,approve', 'nullable', 'string'],
            'caisse_decaissement' => ['required_if:decision,approve', 'nullable', 'string', 'max:255'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
            'allocations' => ['required_if:decision,approve', 'array', 'min:1'],
            'allocations.*.demande_id' => ['required', 'string', 'distinct'],
            'allocations.*.code_allocation' => ['required', 'string', 'max:255'],
        ]);

        if ($validated['decision'] === 'approve') {
            if (! Hash::check($validated['password'], $user->password)) {
                return Redirect::back()->withErrors([
                    'password' => 'Signature refusée : Le mot de passe du Manager de Projet est incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            if ($validated['decision'] === 'approve') {
                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                foreach ($validated['allocations'] as $allocation) {
                    $demande = $demandes->get($allocation['demande_id']);
                    if ($demande) {
                        $demande->update([
                            'code_allocation' => trim($allocation['code_allocation']),
                            'code_all_budget' => trim($allocation['code_allocation']),
                        ]);
                    }
                }

                $lockedRequisition->update([
                    'status' => 'visa_mp',
                    'caisse_decaissement' => $validated['caisse_decaissement'],
                ]);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'project_manager',
                    'approved',
                    "Visa MP accordé. Caisse : {$validated['caisse_decaissement']}"
                );

                // 1. Notification au Manager lui-même
                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa MP accordé',
                    message: "Vous avez apposé votre signature électronique sur la réquisition {$lockedRequisition->numero_requisition}."
                );

                // 2. Notification à l'initiateur (Staff)
                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Manager de Projet accordé',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le MP et transmise aux Finances."
                );

                // 3. Notification aux Finances
                $this->notifierRole(
                    roleCible: 'finance',
                    projectId: null,
                    titre: 'Nouvelle réquisition pour contrôle budgétaire',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->projet}) est en attente de visa financier."
                );

                return;
            }

            // Rejet MP
            $lockedRequisition->update([
                'status' => 'rejetee',
                'observation' => trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '') . 'Motif rejet MP: ' . $validated['motif_rejet']),
            ]);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'project_manager',
                'rejected',
                $validated['motif_rejet']
            );

            // Notification rejet à l'initiateur
            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition rejetée par le MP',
                message: "Votre réquisition {$lockedRequisition->numero_requisition} a été rejetée : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa Manager de Projet accordé avec certificat cryptographique.'
                : 'Réquisition rejetée par le Manager de Projet.'
        );
    }

    /**
     * DÉCISION DU MANAGER DES FINANCES AVEC NOTIFICATION BILATÉRALE.
     */
    public function financeDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('finance'), 403, 'Action réservée au Manager des Finances.');
        abort_unless($requisition->status === 'visa_mp', 403, 'Cette réquisition n’est pas en attente de visa financier.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'password' => ['required_if:decision,approve', 'nullable', 'string'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            if (! Hash::check($validated['password'], $user->password)) {
                return Redirect::back()->withErrors([
                    'password' => 'Signature refusée : Le mot de passe financier est incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update(['status' => 'controle_finance']);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'finance',
                    'approved',
                    'Visa de contrôle financier et budgétaire accordé.'
                );

                // 1. Notification au Financier lui-même
                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa Financier accordé',
                    message: "Vous avez apposé votre visa financier sur {$lockedRequisition->numero_requisition}."
                );

                // 2. Notification à l'initiateur
                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Financier accordé',
                    message: "Le visa financier a été accordé pour votre réquisition {$lockedRequisition->numero_requisition}."
                );

                // 3. Notification au Manager de Projet
                $this->notifierRole(
                    roleCible: 'project_manager',
                    projectId: $lockedRequisition->project_id,
                    titre: 'Visa Financier accordé (Projet)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} a franchi le contrôle budgétaire."
                );

                // 4. Notification à l'Administration
                $this->notifierRole(
                    roleCible: 'admin_manager',
                    projectId: null,
                    titre: 'Dossier en attente de visa administratif',
                    message: "La réquisition {$lockedRequisition->numero_requisition} est prête pour visa administratif."
                );

                return;
            }

            // Rejet Finance
            $lockedRequisition->update([
                'status' => 'draft',
                'observation' => trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '') . 'Motif rejet Finance: ' . $validated['motif_rejet']),
            ]);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'finance',
                'rejected',
                $validated['motif_rejet']
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition renvoyée par les Finances',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été renvoyée pour correction : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa financier apposé avec succès.'
                : 'Dossier renvoyé pour correction budgétaire.'
        );
    }

    public function urgentDirectorApproval(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        abort_unless($user?->hasRole('director'), 403, 'Action réservée à la Directrice Générale.');
        abort_unless($requisition->status === 'urgent_direction', 403, 'Cette réquisition n’est pas en attente de dérogation urgente.');

        DB::transaction(function () use ($requisition, $user) {
            $requisition->update([
                'status' => 'draft',
            ]);

            $this->enregistrerSignature(
                $requisition,
                $user,
                'director',
                'approved',
                'Accord de principe pour traitement d\'URGENCE prioritaire.'
            );

            $this->notifierUtilisateur(
                userId: $requisition->user_id,
                titre: 'Dérogation Urgente Accordée',
                message: "La Directrice Générale a accordé la dérogation prioritaire pour votre réquisition {$requisition->numero_requisition}."
            );
        });

        return Redirect::back()->with('success', 'Dérogation urgente accordée. Dossier réintégré dans le circuit prioritaire.');
    }

    protected function enregistrerSignature(Requisition $requisition, User $user, string $roleSignataire, string $action, ?string $commentaire = null): void
    {
        $now = now();
        $hash = hash('sha256', $requisition->id . $user->id . $roleSignataire . $action . $now->toIso8601String() . config('app.key'));

        $rolePrefix = match ($roleSignataire) {
            'project_manager' => 'MP',
            'finance' => 'MF',
            'admin_manager' => 'MA',
            'director' => 'DG',
            default => 'INIT',
        };

        $userInitials = strtoupper(substr($user->name, 0, 2));
        $signatureCode = sprintf('BP-SIG-%s-%s-%s-%s', $rolePrefix, $userInitials, $now->format('ymd'), strtoupper(substr($hash, 0, 4)));

        RequisitionSignature::create([
            'requisition_id' => $requisition->id,
            'user_id' => $user->id,
            'role_signataire' => $roleSignataire,
            'nom_signataire' => $user->name,
            'action' => $action,
            'commentaire' => $commentaire,
            'signature_code' => $signatureCode,
            'signature_hash' => $hash,
            'signed_at' => $now,
        ]);
    }

    protected function notifierRole(string $roleCible, ?string $projectId, string $titre, string $message, bool $urgent = false): void
    {
        $query = User::role($roleCible);
        
        if ($projectId) {
            $query->where(function ($q) use ($projectId) {
                $q->where('project_id', $projectId)
                  ->orWhereHas('project', fn ($p) => $p->where('id', $projectId));
            });
        }

        $users = $query->get();

        if ($users->isEmpty() && $roleCible === 'project_manager') {
            $users = User::role('project_manager')->get();
        }

        foreach ($users as $u) {
            $this->notifierUtilisateur($u->id, $titre, $message, $urgent);
        }
    }


    public function adminDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('admin_manager'), 403, 'Action réservée au Manager de l\'Administration.');
        abort_unless($requisition->status === 'controle_finance', 403, 'Cette réquisition n’est pas en attente de visa administratif.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'password' => ['required_if:decision,approve', 'nullable', 'string'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            if (! Hash::check($validated['password'], $user->password)) {
                return Redirect::back()->withErrors([
                    'password' => 'Signature refusée : Le mot de passe administratif est incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update(['status' => 'visa_admin']);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'admin_manager',
                    'approved',
                    'Visa de contrôle administratif accordé.'
                );

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa Administratif accordé',
                    message: "Vous avez visé administrativement la réquisition {$lockedRequisition->numero_requisition}."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Administratif accordé',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a franchi le contrôle administratif."
                );

                $this->notifierRole(
                    roleCible: 'director',
                    projectId: null,
                    titre: 'Dossier en attente d\'approbation finale (Directrice)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) est prête pour votre approbation finale."
                );

                return;
            }

            $lockedRequisition->update([
                'status' => 'draft',
                'observation' => trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '') . 'Motif rejet Administratif: ' . $validated['motif_rejet']),
            ]);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'admin_manager',
                'rejected',
                $validated['motif_rejet']
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition renvoyée par l\'Administration',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été renvoyée : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa administratif accordé avec succès. Transmis à la Directrice Générale pour approbation finale.'
                : 'Dossier renvoyé pour correction administrative.'
        );
    }

    public function directorDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('director'), 403, 'Action réservée exclusivement à la Directrice Générale.');
        abort_unless($requisition->status === 'visa_admin', 403, 'Cette réquisition n’est pas en attente d’approbation finale.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'password' => ['required_if:decision,approve', 'nullable', 'string'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            if (! Hash::check($validated['password'], $user->password)) {
                return Redirect::back()->withErrors([
                    'password' => 'Signature refusée : Le mot de passe de la Directrice Générale est incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update(['status' => 'decaissement_caisse']);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'director',
                    'approved',
                    'Bon à payer accordé. Autorisation de décaissement transmise à la Caisse.'
                );

                $this->notifierRole(
                    roleCible: 'cashier',
                    projectId: null,
                    titre: 'Nouveau bon à payer (Caisse)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) a été approuvée par la Directrice. Décaissement autorisé au guichet."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Réquisition Approuvée (Prête pour Caisse)',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été approuvée par la Directrice Générale. Les fonds sont prêts au guichet : {$lockedRequisition->caisse_decaissement}."
                );

                return;
            }

            $lockedRequisition->update([
                'status' => 'draft',
                'observation' => trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '') . 'Motif rejet Direction: ' . $validated['motif_rejet']),
            ]);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'director',
                'rejected',
                $validated['motif_rejet']
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition refusée par la Directrice',
                message: "Votre réquisition {$lockedRequisition->numero_requisition} a été refusée : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Bon à payer accordé avec succès. Dossier transmis à la Caisse pour décaissement.'
                : 'Dossier rejeté par la Directrice Générale.'
        );
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

    protected function mapStatusToWorkflow(string $status): string
    {
        return match ($status) {
            'draft' => 'brouillon',
            'urgent_direction' => 'urgent_direction',
            'visa_mp' => 'visa_mp',
            'controle_finance' => 'controle_finance',
            'visa_admin' => 'visa_admin',
            'approbation_direction' => 'approbation_direction',
            'decaissement_caisse' => 'decaissement_caisse',
            'cloture' => 'cloture',
            default => 'brouillon',
        };
    }
}