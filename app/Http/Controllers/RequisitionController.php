<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\BudgetLine;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
        $requisitions = Requisition::with(['demandes.justificatifs', 'signatures.user', 'project', 'user'])
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Requisition $requisition) {
                return [
                    'id' => $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'project_id' => $requisition->project_id,
                    'demandeurNom' => $requisition->user?->name ?? Auth::user()->name,
                    'initiateurNom' => $requisition->user?->name ?? Auth::user()->name,
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
                    'statusCode' => $requisition->status,
                    'statusLabel' => match ($requisition->status) {
                        'returned_to_beneficiary' => 'À corriger par le bénéficiaire',
                        'returned_to_urgent_initiator' => 'À corriger par l’initiateur urgent',
                        'draft' => 'En attente du Manager de Projet',
                        'urgent_direction' => 'En attente de la Directrice (urgence)',
                        'visa_mp' => 'En attente des Finances',
                        'controle_finance' => 'En attente du PAM',
                        'visa_admin' => 'En attente de la Directrice',
                        'decaissement_caisse' => 'En attente de la Caisse',
                        'decaisse' => 'Décaissée',
                        default => ucfirst($requisition->status),
                    },
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

        $caisses = CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']);

        return Inertia::render('Staff/Requisitions/Index', [
            'requisitions' => $requisitions,
            'caisses' => $caisses,
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
            || $user->canApproveAsDirector();

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
        $resubmissionStatus = $this->correctionResubmissionStatus($user, $requisition);
        abort_unless($resubmissionStatus !== null, 403, 'Vous n’êtes pas autorisé à modifier cette réquisition.');

        $validated = $request->validate([
            'nature_requisition' => ['sometimes', 'in:Achat,Service'],
            'caisse_decaissement' => ['required', 'string', 'max:255', Rule::exists('cash_registers', 'name')->where('is_active', true)],
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
            'articles.*.justificatifs' => ['nullable', 'array'],
            'articles.*.justificatifs.*.description' => ['nullable', 'string', 'max:255'],
            'articles.*.justificatifs.*.date' => ['nullable', 'date'],
            'articles.*.justificatifs.*.montant' => ['nullable', 'numeric', 'min:0'],
            'articles.*.justificatifs.*.file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ], [
            'caisse_decaissement.exists' => 'Veuillez sélectionner une caisse officielle valide.',
        ]);

        $natureRequisition = $validated['nature_requisition'] ?? $requisition->nature_requisition;

        DB::transaction(function () use ($validated, $requisition, $natureRequisition, $user, $resubmissionStatus, $request) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless(
                $this->correctionResubmissionStatus($user, $lockedRequisition) === $resubmissionStatus,
                403,
                'Cette réquisition n’est plus disponible pour correction.'
            );
            $previousStatus = $lockedRequisition->status;
            $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
            $montantTotal = 0;
            $observation = $validated['observation'] ?? null;

            foreach ($validated['articles'] as $articleIndex => $article) {
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

                foreach ($request->file("articles.{$articleIndex}.justificatifs", []) as $justificatifIndex => $fileData) {
                    $uploadedFile = is_array($fileData) ? ($fileData['file'] ?? null) : $fileData;
                    if (! $uploadedFile instanceof \Illuminate\Http\UploadedFile || ! $uploadedFile->isValid()) {
                        continue;
                    }

                    $metadata = $request->input("articles.{$articleIndex}.justificatifs.{$justificatifIndex}", []);
                    $path = $uploadedFile->store('requisition-attachments', 'public');

                    DemandeJustificatif::create([
                        'demande_id' => $demande->id,
                        'description' => $metadata['description'] ?? $uploadedFile->getClientOriginalName(),
                        'date' => $metadata['date'] ?? now()->toDateString(),
                        'montant' => (float) ($metadata['montant'] ?? 0),
                        'file_path' => $path,
                        'original_name' => $uploadedFile->getClientOriginalName(),
                        'mime_type' => $uploadedFile->getClientMimeType(),
                    ]);
                }
            }

            $lockedRequisition->update([
                'caisse_decaissement' => $validated['caisse_decaissement'],
                'nature_requisition' => $natureRequisition,
                'devise' => $validated['devise'],
                'observation' => $observation,
                'montant_total' => round($montantTotal, 2),
                'status' => $resubmissionStatus,
            ]);

            $correctionRole = match (true) {
                $user->hasRole('project_manager') => 'project_manager',
                $user->hasRole('finance') => 'finance',
                $user->hasRole('admin_manager') => 'admin_manager',
                default => 'initiator',
            };
            $rejection = $lockedRequisition->signatures()
                ->where('action', 'rejected')
                ->latest('signed_at')
                ->first();

            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: $correctionRole,
                action: 'resubmitted',
                commentaire: $rejection?->commentaire
                    ? "Correction après rejet : {$rejection->commentaire}"
                    : "Correction enregistrée après retour au statut {$previousStatus}."
            );
        });

        $nextRole = match ($resubmissionStatus) {
            'draft' => 'project_manager',
            'visa_mp' => 'finance',
            'controle_finance' => 'admin_manager',
            'visa_admin', 'urgent_direction' => 'director',
            default => null,
        };
        if ($nextRole !== null) {
            $this->notifierRole(
                roleCible: $nextRole,
                projectId: $nextRole === 'project_manager' ? $requisition->project_id : null,
                titre: 'Réquisition corrigée et resoumise',
                message: "La réquisition {$requisition->numero_requisition} a été corrigée et attend votre intervention.",
                urgent: (bool) $requisition->is_urgent
            );
        }

        return Redirect::back()->with('success', 'Réquisition corrigée et resoumise à l’étape suivante.');
    }

    private function correctionResubmissionStatus(User $user, Requisition $requisition): ?string
    {
        $isOwner = $requisition->user_id === $user->id;

        if ($requisition->status === 'returned_to_urgent_initiator' && $isOwner) {
            return 'urgent_direction';
        }

        if ($user->hasRole('project_manager')
            && $user->project_id !== null
            && $user->project_id === $requisition->project_id) {
            if ($requisition->status === 'returned_to_project_manager') {
                return 'visa_mp';
            }

            if ($isOwner && in_array($requisition->status, ['draft', 'visa_mp'], true)) {
                return $requisition->status;
            }
        }

        if ($user->hasRole('finance') && $requisition->status === 'returned_to_finance') {
            return 'controle_finance';
        }

        if ($user->hasRole('admin_manager') && $requisition->status === 'returned_to_admin_manager') {
            return 'visa_admin';
        }

        if ($isOwner
            && ($user->hasRole('beneficiary') || $user->hasRole('coordinator'))
            && in_array($requisition->status, ['draft', 'returned_to_beneficiary'], true)) {
            return 'draft';
        }

        if ($isOwner && $requisition->status === 'draft' && ! $user->hasRole('project_manager')) {
            return 'draft';
        }

        return null;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nature_requisition' => ['required', 'in:Achat,Service'],
            'projet' => ['required', 'string', 'exists:projects,name'],
            'project_code' => ['nullable', 'string'],
            'caisse_decaissement' => ['required', 'string', Rule::exists('cash_registers', 'name')->where('is_active', true)],
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
        ], [
            'caisse_decaissement.required' => 'Veuillez sélectionner une caisse créée.',
            'caisse_decaissement.exists' => 'La caisse sélectionnée est introuvable.',
        ]);

        $project = Project::where('name', $validated['projet'])->firstOrFail();
        $user = $request->user();
        abort_unless(
            $user->hasRole('beneficiary') || $user->hasRole('coordinator') || $user->hasRole('project_manager'),
            403,
            'Seuls un bénéficiaire, un coordinateur ou un Manager de Projet peut créer une réquisition.'
        );

        if ($user->hasRole('project_manager')) {
            abort_unless($user->project_id !== null && $user->project_id === $project->id, 403, 'Vous ne pouvez créer une réquisition que pour votre projet.');
        }

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
            'caisse_decaissement' => $validated['caisse_decaissement'],
            'devise' => $validated['devise'],
            'observation' => $validated['observation'] ?? null,
            'montant_total' => $validated['montant_total'],
            'is_urgent' => $isUrgent,
            'date_paiement' => $validated['date_paiement'] ?? null,
            'date_livraison' => $validated['date_livraison'] ?? null,
            'status' => $initialStatus,
        ]);

        $this->enregistrerSignature(
            $requisition,
            $user,
            'initiateur',
            'submitted',
            $isUrgent ? 'Soumission URGENTE' : 'Soumission initiale'
        );

        $this->notifierUtilisateur(
            userId: $user->id,
            titre: 'Réquisition transmise',
            message: "Votre réquisition {$numeroChronologique} a été transmise avec succès au Manager de Projet.",
            urgent: $isUrgent
        );

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

    public function managerDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('project_manager'), 403, 'Action réservée au Manager de Projet.');
        abort_unless($user->project_id !== null && $user->project_id === $requisition->project_id, 403, 'Cette réquisition appartient à un autre projet.');
        abort_unless($requisition->status === 'draft' && $requisition->user?->hasRole('beneficiary'), 403,
            'Le Manager de Projet ne peut décider que sur une réquisition soumise par un bénéficiaire en statut Brouillon.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'caisse_decaissement' => [
                'required_if:decision,approve',
                'nullable',
                'string',
                'max:255',
                Rule::exists('cash_registers', 'name')->where('is_active', true),
            ],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
            'allocations' => ['required_if:decision,approve', 'array', 'min:1'],
            'allocations.*.demande_id' => ['required', 'string', 'distinct'],
            'allocations.*.code_allocation' => ['required', 'string', 'max:255'],
        ]);

        if ($validated['decision'] === 'approve') {
            $secret = $validated['pin'] ?? $validated['password'] ?? $request->input('pin') ?? $request->input('password');

            if (! $this->verifierSecretSignature($user, $secret)) {
                return Redirect::back()->withErrors([
                    'pin' => 'Signature refusée : Code PIN (ou mot de passe) incorrect.',
                    'password' => 'Signature refusée : Code PIN (ou mot de passe) incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless(
                $lockedRequisition->project_id === $user->project_id
                    && $lockedRequisition->status === 'draft'
                    && $lockedRequisition->user?->hasRole('beneficiary'),
                403,
                'Le Manager de Projet ne peut décider que sur une réquisition soumise par un bénéficiaire en statut Brouillon.'
            );

            if ($validated['decision'] === 'approve') {
                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                foreach ($validated['allocations'] as $allocation) {
                    $demande = $demandes->get($allocation['demande_id']);
                    if ($demande) {
                        $demande->update([
                            'code_allocation' => trim($allocation['code_allocation']),
                            'code_all_budget' => trim($allocation['code_allocation']),
                            'libelle_allocation' => BudgetLine::query()
                                ->where('project_id', $lockedRequisition->project_id)
                                ->whereRaw('LOWER(TRIM(code)) = ?', [
                                    BudgetLine::normalizeCode($allocation['code_allocation']),
                                ])
                                ->value('libelle') ?? 'code non specifie',
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

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa MP accordé',
                    message: "Vous avez apposé votre signature certifiée sur la réquisition {$lockedRequisition->numero_requisition}."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Manager de Projet accordé',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le MP et transmise aux Finances."
                );

                $this->notifierRole(
                    roleCible: 'finance',
                    projectId: null,
                    titre: 'Nouvelle réquisition pour contrôle budgétaire',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->projet}) est en attente de visa financier."
                );

                return;
            }

            $lockedRequisition->update(['status' => 'returned_to_beneficiary']);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'project_manager',
                'rejected',
                $validated['motif_rejet']
            );

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

    public function financeDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('finance'), 403, 'Action réservée au Manager des Finances.');
        abort_unless($requisition->status === 'visa_mp', 403, 'Cette réquisition n’est pas en attente de visa financier.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'caisse_decaissement' => [
                'nullable',
                'string',
                'max:255',
                Rule::exists('cash_registers', 'name')->where('is_active', true),
            ],
            'allocations' => ['nullable', 'array'],
            'allocations.*.demande_id' => ['required_with:allocations', 'string'],
            'allocations.*.code_allocation' => ['required_with:allocations', 'string', 'max:255'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            $secret = $validated['pin'] ?? $validated['password'] ?? $request->input('pin') ?? $request->input('password');

            if (! $this->verifierSecretSignature($user, $secret)) {
                return Redirect::back()->withErrors([
                    'pin' => 'Signature refusée : Code PIN (ou mot de passe) financier incorrect.',
                    'password' => 'Signature refusée : Code PIN (ou mot de passe) financier incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'visa_mp', 403, 'Cette réquisition n’est plus en attente de visa financier.');

            if ($validated['decision'] === 'approve') {
                // 1. Mise à jour de la caisse si modifiée par le Manager Finance
                if (! empty($validated['caisse_decaissement'])) {
                    $lockedRequisition->caisse_decaissement = $validated['caisse_decaissement'];
                }

                // 2. Mise à jour ou correction des lignes budgétaires par le Manager Finance
                if (! empty($validated['allocations'])) {
                    $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                    foreach ($validated['allocations'] as $allocation) {
                        $demande = $demandes->get($allocation['demande_id']);
                        if ($demande) {
                            $code = trim($allocation['code_allocation']);
                            $libelle = BudgetLine::query()
                                ->where('project_id', $lockedRequisition->project_id)
                                ->whereRaw('LOWER(TRIM(code)) = ?', [BudgetLine::normalizeCode($code)])
                                ->value('libelle') ?? 'code non specifie';

                            $demande->update([
                                'code_allocation' => $code,
                                'code_all_budget' => $code,
                                'libelle_allocation' => $libelle,
                            ]);
                        }
                    }
                }

                $lockedRequisition->status = 'controle_finance';
                $lockedRequisition->save();

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'finance',
                    'approved',
                    "Visa de contrôle financier et budgétaire accordé. Caisse : {$lockedRequisition->caisse_decaissement}"
                );

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa Financier accordé',
                    message: "Vous avez apposé votre visa financier sur {$lockedRequisition->numero_requisition}."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Financier accordé',
                    message: "Le visa financier a été accordé pour votre réquisition {$lockedRequisition->numero_requisition}."
                );

                $this->notifierRole(
                    roleCible: 'admin_manager',
                    projectId: null,
                    titre: 'Dossier en attente de visa administratif',
                    message: "La réquisition {$lockedRequisition->numero_requisition} est prête pour visa administratif."
                );

                return;
            }

            $lockedRequisition->update(['status' => 'returned_to_project_manager']);

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
            $this->notifierRole(
                roleCible: 'project_manager',
                projectId: $lockedRequisition->project_id,
                titre: 'Réquisition à corriger après refus des Finances',
                message: "La réquisition {$lockedRequisition->numero_requisition} doit être corrigée avant un nouvel examen financier."
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa financier certifié et corrections budgétaires enregistrées.'
                : 'Dossier renvoyé pour correction budgétaire.'
        );
    }

    public function adminDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('admin_manager'), 403, 'Action réservée au Manager de l\'Administration.');
        abort_unless($requisition->status === 'controle_finance', 403, 'Cette réquisition n’est pas en attente de visa administratif.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            $secret = $validated['pin'] ?? $validated['password'] ?? $request->input('pin') ?? $request->input('password');

            if (! $this->verifierSecretSignature($user, $secret)) {
                return Redirect::back()->withErrors([
                    'pin' => 'Signature refusée : Code PIN (ou mot de passe) administratif incorrect.',
                    'password' => 'Signature refusée : Code PIN (ou mot de passe) administratif incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'controle_finance', 403, 'Cette réquisition n’est plus en attente de visa administratif.');

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

            $lockedRequisition->update(['status' => 'returned_to_finance']);

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
            $this->notifierRole(
                roleCible: 'finance',
                projectId: null,
                titre: 'Réquisition à corriger après refus du PAM',
                message: "La réquisition {$lockedRequisition->numero_requisition} doit être corrigée avant un nouvel examen administratif."
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

        abort_unless(
            $user?->canApproveAsDirector(),
            403,
            'Action réservée exclusivement à la Direction Générale (ou au PAM en intérim officiel).'
        );

        abort_unless(
            $requisition->status === 'visa_admin',
            403,
            'Cette réquisition n’est pas en attente d’approbation finale.'
        );

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        if ($validated['decision'] === 'approve') {
            $secret = $validated['pin'] ?? $validated['password'] ?? $request->input('pin') ?? $request->input('password');

            if (! $this->verifierSecretSignature($user, $secret)) {
                return Redirect::back()->withErrors([
                    'pin' => 'Signature refusée : Code PIN (ou mot de passe) de la Direction incorrect.',
                    'password' => 'Signature refusée : Code PIN (ou mot de passe) de la Direction incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'visa_admin', 403, 'Cette réquisition n’est plus en attente d’approbation finale.');

            $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;
            $signataireNom = $isInterim ? ($user->name . ' (P.O. / Intérim)') : $user->name;

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update(['status' => 'decaissement_caisse']);

                $commentaireSignature = $isInterim
                    ? 'Bon à payer accordé pour ordre / intérim par le Manager Administratif (PAM). Autorisation de décaissement transmise à la Caisse.'
                    : 'Bon à payer accordé. Autorisation de décaissement transmise à la Caisse.';

                $this->enregistrerSignature(
                    requisition: $lockedRequisition,
                    user: $user,
                    roleSignataire: 'director',
                    action: 'approved',
                    commentaire: $commentaireSignature,
                    nomSignataireCustom: $signataireNom
                );

                $mentionAuteur = $isInterim ? 'la Direction Générale (Pour ordre / Intérim)' : 'la Directrice Générale';

                $this->notifierRole(
                    roleCible: 'cashier',
                    projectId: null,
                    titre: 'Nouveau bon à payer (Caisse)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) a été approuvée par {$mentionAuteur}. Décaissement autorisé au guichet."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Réquisition Approuvée (Prête pour Caisse)',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été approuvée par {$mentionAuteur}. Les fonds sont prêts au guichet : {$lockedRequisition->caisse_decaissement}."
                );

                return;
            }

            $lockedRequisition->update([
                'status' => 'returned_to_admin_manager',
            ]);

            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: 'director',
                action: 'rejected',
                commentaire: $validated['motif_rejet'],
                nomSignataireCustom: $signataireNom
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition refusée par la Direction',
                message: "Votre réquisition {$lockedRequisition->numero_requisition} a été refusée : {$validated['motif_rejet']}"
            );
            $this->notifierRole(
                roleCible: 'admin_manager',
                projectId: null,
                titre: 'Réquisition à corriger après refus de la Direction',
                message: "La réquisition {$lockedRequisition->numero_requisition} doit être corrigée par le PAM avant une nouvelle soumission à la Direction."
            );
        });

        $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? ($isInterim
                    ? 'Bon à payer accordé pour ordre / intérim. Dossier transmis à la Caisse pour décaissement.'
                    : 'Bon à payer accordé avec succès. Dossier transmis à la Caisse pour décaissement.')
                : 'Dossier rejeté par la Direction.'
        );
    }

    public function urgentDirectorApproval(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless(
            $user?->canApproveAsDirector(),
            403,
            'Action réservée à la Directrice Générale (ou intérim officiel).'
        );

        abort_unless($requisition->status === 'urgent_direction', 403, 'Cette réquisition n’est pas en attente de dérogation urgente.');

        $validated = $request->validate([
            'decision' => ['sometimes', 'in:approve,reject'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);
        $decision = $validated['decision'] ?? 'approve';

        DB::transaction(function () use ($requisition, $user, $validated, $decision) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'urgent_direction', 403, 'Cette réquisition n’est plus en attente de dérogation urgente.');
            $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;
            $signataireNom = $isInterim ? ($user->name . ' (P.O. / Intérim)') : $user->name;

            if ($decision === 'approve') {
                $lockedRequisition->update(['status' => 'decaissement_caisse']);

                $this->enregistrerSignature(
                    requisition: $lockedRequisition,
                    user: $user,
                    roleSignataire: 'director',
                    action: 'approved',
                    commentaire: 'Approbation URGENTE accordée. Décaissement transmis à la Caisse.' . ($isInterim ? ' (Pour ordre / Intérim).' : '.'),
                    nomSignataireCustom: $signataireNom
                );

                $mentionDirection = $isInterim ? 'la Direction Générale (Pour ordre / Intérim)' : 'la Directrice Générale';
                $this->notifierRole(
                    roleCible: 'cashier',
                    projectId: null,
                    titre: 'Réquisition urgente autorisée au décaissement',
                    message: "La réquisition {$lockedRequisition->numero_requisition} a été approuvée par {$mentionDirection} et transmise directement à la Caisse."
                );
                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Réquisition urgente approuvée',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été approuvée et transmise directement à la Caisse."
                );

                return;
            }

            $lockedRequisition->update(['status' => 'returned_to_urgent_initiator']);
            $this->enregistrerSignature(
                requisition: $lockedRequisition,
                user: $user,
                roleSignataire: 'director',
                action: 'rejected',
                commentaire: $validated['motif_rejet'],
                nomSignataireCustom: $signataireNom
            );
            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition urgente renvoyée pour correction',
                message: "Votre réquisition urgente {$lockedRequisition->numero_requisition} a été renvoyée pour correction : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $decision === 'approve' ? 'success' : 'error',
            $decision === 'approve'
                ? 'Réquisition urgente approuvée et transmise directement à la Caisse.'
                : 'Réquisition urgente renvoyée à son initiateur pour correction.'
        );
    }

    protected function verifierSecretSignature(User $user, ?string $secret): bool
    {
        if (empty($secret)) {
            return false;
        }

        if (! empty($user->signature_pin) && Hash::check($secret, $user->signature_pin)) {
            return true;
        }

        if (! empty($user->password) && Hash::check($secret, $user->password)) {
            return true;
        }

        return false;
    }

    protected function enregistrerSignature(
        Requisition $requisition,
        User $user,
        string $roleSignataire,
        string $action,
        ?string $commentaire = null,
        ?string $nomSignataireCustom = null
    ): void {
        $now = now();
        $hash = hash('sha256', $requisition->id . $user->id . $roleSignataire . $action . $now->toIso8601String() . config('app.key'));

        $rolePrefix = match ($roleSignataire) {
            'project_manager' => 'MP',
            'finance' => 'MF',
            'admin_manager' => 'MA',
            'director' => 'DG',
            'cashier' => 'CS',
            default => 'INIT',
        };

        $userInitials = strtoupper(substr($user->name, 0, 2));
        $signatureCode = sprintf('BP-SIG-%s-%s-%s-%s', $rolePrefix, $userInitials, $now->format('ymd'), strtoupper(substr($hash, 0, 4)));

        RequisitionSignature::create([
            'requisition_id' => $requisition->id,
            'user_id' => $user->id,
            'role_signataire' => $roleSignataire,
            'nom_signataire' => $nomSignataireCustom ?: $user->name,
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
            'draft' => 'visa_mp',
            'urgent_direction' => 'approbation_direction',
            'returned_to_beneficiary', 'returned_to_urgent_initiator' => 'brouillon',
            'returned_to_project_manager' => 'visa_mp',
            'returned_to_finance' => 'controle_finance',
            'returned_to_admin_manager' => 'visa_admin',
            'visa_mp' => 'controle_finance',
            'controle_finance' => 'visa_admin',
            'visa_admin' => 'approbation_direction',
            'approbation_direction' => 'approbation_direction',
            'decaissement_caisse' => 'decaissement_caisse',
            'decaisse' => 'cloture',
            'cloture' => 'cloture',
            default => 'brouillon',
        };
    }
}