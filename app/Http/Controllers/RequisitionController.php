<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashRegister;
use App\Models\DailyExchangeRate;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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
                    'derniere_observation' => $requisition->derniere_observation,
                    'statusCode' => $requisition->status,
                    'statusLabel' => match ($requisition->status) {
                        'returned_to_beneficiary' => 'À corriger par l’initiateur',
                        'returned_to_urgent_initiator' => 'À corriger par l’initiateur urgent',
                        'returned_to_project_manager' => 'À arbitrer par le Chef de Projet',
                        'returned_to_finance' => 'À arbitrer par le Chef de Projet',
                        'returned_to_admin_manager' => 'À arbitrer par le Chef de Projet',
                        'draft' => 'En attente du Manager de Projet',
                        'urgent_direction' => 'En attente de la Directrice (urgence)',
                        'visa_mp' => 'En attente du PAM',
                        'visa_pam' => 'En attente des Finances',
                        'controle_finance' => 'En attente des Finances',
                        'visa_admin' => 'En attente de la Directrice',
                        'decaissement_caisse' => 'En attente de la Caisse',
                        'decaisse' => 'Décaissée',
                        default => ucfirst(str_replace('_', ' ', $requisition->status)),
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
                            'hashShort' => substr($sig->signature_hash, 0, 16).'...',
                            'commentaire' => $sig->commentaire,
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
        if (! $user) {
            abort(403);
        }

        $requisition = $justificatif->demande?->requisition;
        $isAuthorized = $requisition?->user_id === $user->id
            || $user->hasRole('admin')
            || ($user->hasRole('project_manager') && $user->project_id !== null && $user->project_id === $requisition?->project_id)
            || $user->hasRole('finance')
            || $user->hasRole('admin_manager')
            || $user->canApproveAsDirector();

        if (! $isAuthorized) {
            abort(403, 'Vous n’êtes pas autorisé à consulter ce fichier.');
        }
        if (empty($justificatif->file_path) || ! Storage::disk('public')->exists($justificatif->file_path)) {
            abort(404, 'Fichier introuvable.');
        }

        $absolutePath = Storage::disk('public')->path($justificatif->file_path);

        return response()->file($absolutePath, [
            'Content-Type' => $justificatif->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.($justificatif->original_name ?: basename($absolutePath)).'"',
        ]);
    }

    public function update(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        $resubmissionStatus = $this->correctionResubmissionStatus($user, $requisition);
        abort_unless($resubmissionStatus !== null, 403, 'Vous n’êtes pas autorisé à corriger cette réquisition à ce stade.');

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
                if (! $demande) {
                    continue;
                }

                $quantiteOuDuree = (float) $article['quantiteOuDuree'];
                $fraisUnitaire = (float) $article['prixUnitaire'];
                $totalLigne = round($quantiteOuDuree * $fraisUnitaire, 2);
                $isService = strtolower($natureRequisition) === 'service';

                $demande->update([
                    'activite' => $article['activite'],
                    'code_all_budget' => $article['code_all_budget'] ?? $demande->code_all_budget,
                    'code_allocation' => $article['code_all_budget'] ?? $demande->code_allocation,
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
                    if (! $uploadedFile instanceof UploadedFile || ! $uploadedFile->isValid()) {
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
            'visa_mp' => 'admin_manager',
            'visa_pam' => 'finance',
            'visa_admin', 'urgent_direction' => 'director',
            default => null,
        };

        if ($nextRole !== null) {
            $this->notifierRole(
                roleCible: $nextRole,
                projectId: $nextRole === 'project_manager' ? $requisition->project_id : null,
                titre: 'Réquisition corrigée et resoumise',
                message: "La réquisition {$requisition->numero_requisition} a été corrigée et attend votre examen.",
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

        if ($isOwner && $requisition->status === 'returned_to_beneficiary') {
            return 'draft';
        }

        // Le Chef de Projet corrige après n'importe quel rejet et transmet au PAM
        if ($user->hasRole('project_manager')
            && $user->project_id !== null
            && $user->project_id === $requisition->project_id
            && in_array($requisition->status, ['returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager'])) {
            return 'visa_mp';
        }

        if ($isOwner && $requisition->status === 'draft') {
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

        // 1. VÉRIFICATION STRICTE DE COHÉRENCE CAISSE <-> DEVISE
        $caisse = CashRegister::where('name', $validated['caisse_decaissement'])->firstOrFail();
        abort_unless(
            $caisse->devise === $validated['devise'],
            422,
            "Incohérence : la caisse « {$caisse->name} » fonctionne en {$caisse->devise}. La réquisition ne peut pas être créée en {$validated['devise']}."
        );

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

        // 2. CONVERSION DE RÉFÉRENCE EN EURO (€) SUR BASE DU TAUX DU JOUR
        $conversion = DailyExchangeRate::convertToEur((float) $validated['montant_total'], $validated['devise']);

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
            'derniere_observation' => null,
            'montant_total' => $validated['montant_total'],
            'montant_total_eur' => $conversion['montant_eur'],
            'taux_eur_usd' => $conversion['taux_eur_usd'],
            'taux_eur_cdf' => $conversion['taux_eur_cdf'],
            'is_urgent' => $isUrgent,
            'date_paiement' => $validated['date_paiement'] ?? null,
            'date_livraison' => $validated['date_livraison'] ?? null,
            'status' => 'draft',
        ]);

        $this->enregistrerSignature(
            $requisition,
            $user,
            'initiateur',
            'submitted',
            $isUrgent ? 'Soumission URGENTE (Circuit normal prioritaire)' : 'Soumission initiale'
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

            if (! is_array($rawJustificatifs)) {
                $rawJustificatifs = [$rawJustificatifs];
            }
            if (! is_array($uploadedJustificatifs)) {
                $uploadedJustificatifs = [$uploadedJustificatifs];
            }

            foreach ($rawJustificatifs as $justifIndex => $justifData) {
                $uploadedFile = $uploadedJustificatifs[$justifIndex]['file'] ?? ($uploadedJustificatifs[$justifIndex] ?? null);

                if (! $uploadedFile || ! $uploadedFile instanceof UploadedFile || ! $uploadedFile->isValid()) {
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

        abort_unless(in_array($requisition->status, ['draft', 'visa_mp', 'returned_to_project_manager']), 403,
            'La réquisition n\'est pas dans un statut en attente de l\'arbitrage du Manager de Projet.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'observation' => ['nullable', 'string', 'max:5000'],
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

            // Vérification stricte caisse <-> devise de la réquisition
            $caisse = CashRegister::where('name', $validated['caisse_decaissement'])->first();
            if ($caisse && $caisse->devise !== $requisition->devise) {
                return Redirect::back()->withErrors([
                    'caisse_decaissement' => "La caisse sélectionnée ({$caisse->name}) fonctionne en {$caisse->devise}, alors que la réquisition est en {$requisition->devise}.",
                ]);
            }
        }

        $resultat = DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            abort_unless(
                $lockedRequisition->project_id === $user->project_id
                    && in_array($lockedRequisition->status, ['draft', 'visa_mp', 'returned_to_project_manager']),
                403,
                'La réquisition n\'est pas dans un statut en attente de l\'arbitrage du Manager de Projet.'
            );

            if ($validated['decision'] === 'approve') {
                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                $activeRate = DailyExchangeRate::getActiveRate();

                // 1. CONTRÔLE ET BLOCAGE STRICT DES DÉPASSEMENTS BUDGÉTAIRES
                foreach ($validated['allocations'] as $allocation) {
                    $demande = $demandes->get($allocation['demande_id']);
                    if (! $demande) {
                        continue;
                    }

                    $codeNorm = BudgetLine::normalizeCode($allocation['code_allocation']);
                    $budgetLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                        ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                        ->lockForUpdate()
                        ->first();

                    if (! $budgetLine) {
                        return [
                            'success' => false,
                            'error' => "Le code budgétaire « {$allocation['code_allocation']} » est introuvable pour ce projet.",
                        ];
                    }

                    // Calcul de l'équivalent en Euro selon la devise de la ligne budgétaire
                    $conversionLigne = DailyExchangeRate::convertToEur((float) $demande->total_ligne, $lockedRequisition->devise, $activeRate);
                    $montantRequisEur = $conversionLigne['montant_eur'];

                    // Si la ligne budgétaire est en EUR et que le montant la dépasse
                    $soldeDisponible = (float) $budgetLine->solde;
                    if ($montantRequisEur > $soldeDisponible) {
                        return [
                            'success' => false,
                            'error' => "Blocage automatique : La ligne « {$demande->activite} » nécessite {$montantRequisEur} EUR ({$demande->total_ligne} {$lockedRequisition->devise}), ce qui dépasse le solde disponible sur la ligne {$budgetLine->code} ({$soldeDisponible} EUR). Validation impossible.",
                        ];
                    }
                }

                // 2. ENREGISTREMENT DES ALLOCATIONS SI AUCUN DÉPASSEMENT
                foreach ($validated['allocations'] as $allocation) {
                    $demande = $demandes->get($allocation['demande_id']);
                    if ($demande) {
                        $codeNorm = BudgetLine::normalizeCode($allocation['code_allocation']);
                        $libelle = BudgetLine::query()
                            ->where('project_id', $lockedRequisition->project_id)
                            ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                            ->value('libelle') ?? 'code non specifie';

                        $demande->update([
                            'code_allocation' => trim($allocation['code_allocation']),
                            'code_all_budget' => trim($allocation['code_allocation']),
                            'libelle_allocation' => $libelle,
                        ]);
                    }
                }

                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : "Visa MP accordé. Caisse : {$validated['caisse_decaissement']}";

                // STATUT : visa_mp (Transmis STRICTEMENT au PAM)
                $lockedRequisition->update([
                    'status' => 'visa_mp',
                    'caisse_decaissement' => $validated['caisse_decaissement'],
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'project_manager',
                    'approved',
                    $commentaireSignature
                );

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa MP accordé',
                    message: "Vous avez apposé votre signature certifiée sur la réquisition {$lockedRequisition->numero_requisition}."
                );

                if ($lockedRequisition->user_id !== $user->id) {
                    $this->notifierUtilisateur(
                        userId: $lockedRequisition->user_id,
                        titre: 'Visa Manager de Projet accordé',
                        message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le MP et transmise au PAM."
                    );
                }

                $this->notifierRole(
                    roleCible: 'admin_manager',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Réquisition pour visa administratif' : 'Nouvelle réquisition pour examen administratif (PAM)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->projet}) est en attente de visa du PAM.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return ['success' => true];
            }

            // REJET DU PM => RETOUR AU BÉNÉFICIAIRE
            $lockedRequisition->update([
                'status' => 'returned_to_beneficiary',
                'derniere_observation' => $validated['motif_rejet'],
            ]);

            $this->enregistrerSignature(
                $lockedRequisition,
                $user,
                'project_manager',
                'rejected',
                $validated['motif_rejet']
            );

            $this->notifierUtilisateur(
                userId: $lockedRequisition->user_id,
                titre: 'Réquisition retournée par le MP',
                message: "Votre réquisition {$lockedRequisition->numero_requisition} a été retournée : {$validated['motif_rejet']}"
            );

            return ['success' => true];
        });

        if (isset($resultat['success']) && ! $resultat['success']) {
            return Redirect::back()->withErrors([
                'general' => $resultat['error'],
                'pin' => $resultat['error'],
            ]);
        }

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa Manager de Projet accordé. Dossier transmis au PAM.'
                : 'Réquisition retournée à l’initiateur pour correction.'
        );
    }

    /**
     * Examen et décision du PAM (Programme Administration Manager)
     * Le PAM intervient STRICTEMENT lorsque le statut est 'visa_mp'
     */
    public function adminDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('admin_manager'), 403, 'Action réservée au Manager de l\'Administration (PAM).');

        // VÉRIFICATION STRICTE : Le PAM n'intervient que sur 'visa_mp'
        abort_unless(
            $requisition->status === 'visa_mp',
            403,
            'Cette réquisition n’est pas en attente de visa du PAM.'
        );

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'observation' => ['nullable', 'string', 'max:5000'],
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

            abort_unless(
                $lockedRequisition->status === 'visa_mp',
                403,
                'Cette réquisition n’est plus en attente de visa du PAM.'
            );

            if ($validated['decision'] === 'approve') {
                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : 'Visa de contrôle administratif (PAM) accordé.';

                // STATUT : visa_pam (C'est ICI que le dossier est débloqué pour la Finance)
                $lockedRequisition->update([
                    'status' => 'visa_pam',
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'admin_manager',
                    'approved',
                    $commentaireSignature
                );

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa PAM accordé',
                    message: "Vous avez visé administrativement la réquisition {$lockedRequisition->numero_requisition}."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Administratif (PAM) accordé',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le PAM et transmise aux Finances."
                );

                // Notifie UNIQUEMENT la Finance maintenant que le PAM a validé
                $this->notifierRole(
                    roleCible: 'finance',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Réquisition visée par le PAM' : 'Nouvelle réquisition pour contrôle financier',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) est prête pour votre contrôle financier.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return;
            }

            // REJET DU PAM => RETOUR SYSTEMATIQUE AU PROJECT MANAGER
            $lockedRequisition->update([
                'status' => 'returned_to_project_manager',
                'derniere_observation' => $validated['motif_rejet'],
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
                titre: 'Réquisition renvoyée par le PAM',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été retournée : {$validated['motif_rejet']}"
            );

            $this->notifierRole(
                roleCible: 'project_manager',
                projectId: $lockedRequisition->project_id,
                titre: 'Réquisition retournée par le PAM',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été retournée par le PAM : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa administratif (PAM) accordé avec succès. Transmis au service Finance.'
                : 'Dossier renvoyé au Manager de Projet pour arbitrage.'
        );
    }

    /**
     * Contrôle budgétaire et visa de la Finance
     * La Finance intervient STRICTEMENT lorsque le statut est 'visa_pam' (après visa du PAM)
     */
    public function financeDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('finance'), 403, 'Action réservée au Manager des Finances.');

        // VÉRIFICATION STRICTE : La Finance NE PEUT PAS intervenir sur 'visa_mp' !
        // Elle intervient UNIQUEMENT après validation du PAM ('visa_pam').
        abort_unless(
            $requisition->status === 'visa_pam',
            403,
            'Cette réquisition n’a pas encore été visée par le PAM et ne peut être traitée par les Finances.'
        );

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'pin' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'observation' => ['nullable', 'string', 'max:5000'],
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

            abort_unless(
                $lockedRequisition->status === 'visa_pam',
                403,
                'Cette réquisition n’est plus en attente de visa financier.'
            );

            if ($validated['decision'] === 'approve') {
                if (! empty($validated['caisse_decaissement'])) {
                    $lockedRequisition->caisse_decaissement = $validated['caisse_decaissement'];
                }

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

                // STATUT : visa_admin (transmis à la Directrice Générale)
                $lockedRequisition->status = 'visa_admin';
                $lockedRequisition->derniere_observation = $validated['observation'] ?? null;
                $lockedRequisition->save();

                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : "Visa financier accordé. Caisse : {$lockedRequisition->caisse_decaissement}";

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'finance',
                    'approved',
                    $commentaireSignature
                );

                $this->notifierUtilisateur(
                    userId: $user->id,
                    titre: 'Visa Financier accordé',
                    message: "Vous avez apposé votre visa financier sur {$lockedRequisition->numero_requisition}."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Financier accordé',
                    message: "Le visa financier a été accordé pour votre réquisition {$lockedRequisition->numero_requisition}. Transmise à la Direction."
                );

                // Notifie UNIQUEMENT la Direction Générale
                $this->notifierRole(
                    roleCible: 'director',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Dossier en attente d\'approbation finale' : 'Dossier en attente d\'approbation finale (Directrice)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) est prête pour votre approbation finale.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return;
            }

            // REJET DES FINANCES => RETOUR SYSTEMATIQUE AU PROJECT MANAGER
            $lockedRequisition->update([
                'status' => 'returned_to_project_manager',
                'derniere_observation' => $validated['motif_rejet'],
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
                titre: 'Réquisition retournée par les Finances',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été retournée : {$validated['motif_rejet']}"
            );

            $this->notifierRole(
                roleCible: 'project_manager',
                projectId: $lockedRequisition->project_id,
                titre: 'Réquisition retournée par les Finances',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été renvoyée par les Finances : {$validated['motif_rejet']}"
            );
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa financier validé avec succès. Transmis à la Directrice Générale.'
                : 'Dossier renvoyé au Manager de Projet pour arbitrage.'
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
            'observation' => ['nullable', 'string', 'max:5000'],
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
            $signataireNom = $isInterim ? ($user->name.' (P.O. / Intérim)') : $user->name;

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update([
                    'status' => 'decaissement_caisse',
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $commentaireDefaut = $isInterim
                    ? 'Bon à payer accordé pour ordre / intérim par le Manager Administratif (PAM). Autorisation de décaissement transmise à la Caisse.'
                    : 'Bon à payer accordé. Autorisation de décaissement transmise à la Caisse.';

                $commentaireSignature = ! empty($validated['observation']) ? $validated['observation'] : $commentaireDefaut;

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
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Nouveau bon à payer' : 'Nouveau bon à payer (Caisse)',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) a été approuvée par {$mentionAuteur}. Décaissement autorisé au guichet.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Réquisition Approuvée (Prête pour Caisse)',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été approuvée par {$mentionAuteur}. Les fonds sont prêts au guichet : {$lockedRequisition->caisse_decaissement}."
                );

                return;
            }

            // REJET DE LA DIRECTRICE => RETOUR SYSTEMATIQUE AU PROJECT MANAGER
            $lockedRequisition->update([
                'status' => 'returned_to_project_manager',
                'derniere_observation' => $validated['motif_rejet'],
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
                roleCible: 'project_manager',
                projectId: $lockedRequisition->project_id,
                titre: 'Réquisition refusée par la Direction',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été refusée par la Direction : {$validated['motif_rejet']}"
            );
        });

        $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? ($isInterim
                    ? 'Bon à payer accordé pour ordre / intérim. Dossier transmis à la Caisse pour décaissement.'
                    : 'Bon à payer accordé avec succès. Dossier transmis à la Caisse pour décaissement.')
                : 'Dossier rejeté par la Direction et renvoyé au Manager de Projet.'
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
            'observation' => ['nullable', 'string', 'max:5000'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);
        $decision = $validated['decision'] ?? 'approve';

        DB::transaction(function () use ($requisition, $user, $validated, $decision) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'urgent_direction', 403, 'Cette réquisition n’est plus en attente de dérogation urgente.');
            $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;
            $signataireNom = $isInterim ? ($user->name.' (P.O. / Intérim)') : $user->name;

            if ($decision === 'approve') {
                $lockedRequisition->update([
                    'status' => 'decaissement_caisse',
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $commentaire = ! empty($validated['observation'])
                    ? $validated['observation']
                    : ('Approbation URGENTE accordée. Décaissement transmis à la Caisse.'.($isInterim ? ' (Pour ordre / Intérim).' : '.'));

                $this->enregistrerSignature(
                    requisition: $lockedRequisition,
                    user: $user,
                    roleSignataire: 'director',
                    action: 'approved',
                    commentaire: $commentaire,
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

            $lockedRequisition->update([
                'status' => 'returned_to_urgent_initiator',
                'derniere_observation' => $validated['motif_rejet'],
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
        $hash = hash('sha256', $requisition->id.$user->id.$roleSignataire.$action.$now->toIso8601String().config('app.key'));

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
            'returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager' => 'visa_mp',
            'visa_mp' => 'visa_pam',
            'visa_pam' => 'controle_finance',
            'controle_finance' => 'visa_admin',
            'visa_admin' => 'approbation_direction',
            'approbation_direction' => 'approbation_direction',
            'decaissement_caisse' => 'decaissement_caisse',
            'decaisse' => 'cloture',
            'cloture' => 'cloture',
            default => 'brouillon',
        };
    }

    protected function generateQrDataUri(string $hash): string
    {
        $verificationUrl = route('signature.verify', ['hash' => $hash]);

        $qrCode = new QrCode(
            data: $verificationUrl,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 140,
            margin: 2,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        );

        $writer = new PngWriter;
        $result = $writer->write($qrCode);

        return $result->getDataUri();
    }

    public function generatePdf(Requisition $requisition)
    {
        $requisition->load([
            'demandes.justificatifs',
            'signatures.user',
            'project',
            'user',
        ]);

        $pdf = Pdf::loadView('pdf.requisition', compact('requisition'))
            ->setPaper('a4', 'landscape');

        $nomFichier = 'Requisition_'.str_replace('/', '-', $requisition->numero_requisition).'.pdf';

        return $pdf->download($nomFichier);
    }
}
