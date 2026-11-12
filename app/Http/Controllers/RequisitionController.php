<?php

namespace App\Http\Controllers;

use App\Models\BudgetLine;
use App\Models\CashRegister;
use App\Models\DailyExchangeRate;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\DemandeSplit;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use App\Notifications\PaymentRequestReady;
use App\Services\PaymentRequestDocument;
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
        $requisitions = Requisition::with(['demandes.justificatifs', 'demandes.splits', 'signatures.user', 'project', 'user'])
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
                        'finance_precheck' => 'En attente du visa Finance préalable',
                        'visa_mp' => 'En attente du Manager de Projet',
                        'visa_finance' => 'En attente des Finances',
                        'visa_pam' => 'En attente du PAM',
                        'visa_admin' => 'En attente de la Directrice',
                        'payment_request' => 'Payment Request prêt',
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
                            'entreprise' => $demande->entreprise ?? 'BON PASTEUR',
                            'donneur' => $demande->donneur,
                            'codeActivite' => $demande->nature ?? '',
                            'codeAllocation' => $demande->code_allocation ?? $demande->code_all_budget,
                            'nature' => $demande->nature ?? 'Achat',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?? '',
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'splits' => $demande->splits->map(fn ($s) => [
                                'id' => $s->id,
                                'code_allocation' => $s->code_allocation,
                                'libelle_allocation' => $s->libelle_allocation,
                                'montant' => (float) $s->montant,
                            ])->values()->all(),
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
        abort_unless($user, 403);

        $requisition = $justificatif->demande?->requisition;
        $isAuthorized = $requisition?->user_id === $user->id
            || $user->hasRole('admin')
            || ($user->hasRole('project_manager') && $user->project_id !== null && $user->project_id === $requisition?->project_id)
            || $user->hasRole('finance')
            || $user->hasRole('admin_manager')
            || $user->canApproveAsDirector();

        abort_unless($isAuthorized, 403, 'Vous n’êtes pas autorisé à consulter ce fichier.');
        abort_if(empty($justificatif->file_path) || ! Storage::disk('public')->exists($justificatif->file_path), 404, 'Fichier introuvable.');

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
            'articles.*.splits' => ['nullable', 'array'],
            'articles.*.splits.*.code_allocation' => ['required_with:articles.*.splits', 'string', 'max:255'],
            'articles.*.splits.*.montant' => ['required_with:articles.*.splits', 'numeric', 'min:0.01'],
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

            foreach ($validated['articles'] as $articleIndex => $artData) {
                $demande = $demandes->get($artData['id']);
                if (! $demande) continue;

                $qte = (float) $artData['quantiteOuDuree'];
                $pu = (float) $artData['prixUnitaire'];
                $totalLigne = round($qte * $pu, 2);
                $isService = strtolower($natureRequisition) === 'service';
                $montantTotal += $totalLigne;

                $codePrincipal = trim((string) ($artData['code_all_budget'] ?? ''));
                $splitsData = $artData['splits'] ?? [];

                if (! empty($splitsData)) {
                    $demande->splits()->delete();
                    foreach ($splitsData as $split) {
                        $codeNorm = BudgetLine::normalizeCode($split['code_allocation']);
                        $libelle = BudgetLine::where('project_id', $lockedRequisition->project_id)
                            ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                            ->value('libelle') ?? 'Ventilation';

                        DemandeSplit::create([
                            'demande_id' => $demande->id,
                            'code_allocation' => trim($split['code_allocation']),
                            'libelle_allocation' => $libelle,
                            'montant' => (float) $split['montant'],
                        ]);
                    }
                    $codePrincipal = $splitsData[0]['code_allocation'];
                } else {
                    $demande->splits()->delete();
                }

                $demande->update([
                    'activite' => $artData['activite'],
                    'code_all_budget' => $codePrincipal,
                    'code_allocation' => $codePrincipal,
                    'libelle_allocation' => BudgetLine::where('project_id', $lockedRequisition->project_id)
                        ->whereRaw('LOWER(TRIM(code)) = ?', [BudgetLine::normalizeCode($codePrincipal)])
                        ->value('libelle') ?? $demande->libelle_allocation,
                    'nature' => $artData['nature'] ?? $demande->nature,
                    'quantite' => $isService ? 0 : $qte,
                    'duree' => $isService ? $qte : 0,
                    'unite' => $artData['unite'] ?? $demande->unite,
                    'frais_unitaire' => $pu,
                    'total_ligne' => $totalLigne,
                ]);

                foreach ($request->file("articles.{$articleIndex}.justificatifs", []) as $justificatifIndex => $fileData) {
                    $uploadedFile = is_array($fileData) ? ($fileData['file'] ?? null) : $fileData;
                    if (! $uploadedFile instanceof UploadedFile || ! $uploadedFile->isValid()) continue;

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

            $activeRate = DailyExchangeRate::getActiveRate();
            $conversion = DailyExchangeRate::convertToEur($montantTotal, $validated['devise'], $activeRate);

            $lockedRequisition->update([
                'caisse_decaissement' => $validated['caisse_decaissement'],
                'nature_requisition' => $natureRequisition,
                'devise' => $validated['devise'],
                'observation' => $observation,
                'montant_total' => $montantTotal,
                'montant_total_eur' => $conversion['montant_eur'],
                'taux_eur_usd' => $conversion['taux_eur_usd'],
                'taux_eur_cdf' => $conversion['taux_eur_cdf'],
                'status' => $resubmissionStatus,
            ]);

            $correctionRole = match (true) {
                $user->hasRole('project_manager') => 'project_manager',
                $user->hasRole('finance') => 'finance',
                default => 'initiator',
            };

            $rejection = $lockedRequisition->signatures()->where('action', 'rejected')->latest('signed_at')->first();

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
            'visa_finance' => 'finance',
            'visa_pam' => 'admin_manager',
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

        if ($requisition->status === 'returned_to_urgent_initiator' && $isOwner) return 'draft';
        if ($isOwner && $requisition->status === 'returned_to_beneficiary') return 'draft';
        if ($user->hasRole('project_manager') && $user->project_id !== null && $user->project_id === $requisition->project_id && in_array($requisition->status, ['returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager'])) return 'draft';
        if ($isOwner && $requisition->status === 'draft') return 'draft';
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
            'mode_paiement' => ['required', 'string', 'in:Espèces,Virement bancaire,Chèque,Mobile Money,Autre'],
            'beneficiaire_nom' => ['required', 'string', 'max:255'],
            'beneficiaire_adresse' => ['required', 'string', 'max:2000'],
            'beneficiaire_telephone' => ['required', 'string', 'max:50'],
            'beneficiaire_email' => ['required', 'email', 'max:255'],
            'numero_facture' => ['required', 'string', 'max:255'],
            'date_facture' => ['required', 'date'],
            'date_paiement' => ['required', 'date'],
            'observation' => ['nullable', 'string'],
            'montant_total' => ['required', 'numeric', 'min:0'],
            'is_urgent' => ['sometimes', 'boolean'],
            'date_livraison' => ['nullable', 'date'],
            'lignes' => ['required', 'array', 'min:1'],
            'lignes.*.activite' => ['required', 'string', 'max:255'],
            'lignes.*.donneur' => ['required', 'string', 'max:255'],
            'lignes.*.code_all_budget' => ['required', 'string', 'max:255'],
            'lignes.*.nature' => ['required', 'in:Achat,Service'],
            'lignes.*.quantite' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.duree' => ['nullable', 'numeric', 'min:0'],
            'lignes.*.unite' => ['nullable', 'string', 'max:50'],
            'lignes.*.frais_unitaire' => ['required', 'numeric', 'min:0'],
            'lignes.*.total_ligne' => ['required', 'numeric', 'min:0'],
            'lignes.*.justificatifs' => ['nullable', 'array'],
        ]);

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

        // ---> CONTRÔLE DE SÉCURITÉ COORDINATEUR (S'assurer que le projet du POST est bien lié au site du Cordo)
        if ($user->hasRole('coordinator')) {
            abort_unless($user->site_id !== null, 403, 'Vous n\'êtes affecté à aucun site opérationnel.');
            
            $isProjectInSite = $user->site->projects()->where('projects.id', $project->id)->exists();
            abort_unless(
                $isProjectInSite, 
                403, 
                "Sécurité : Le projet {$project->name} n'est pas rattaché au site que vous coordonnez."
            );
        }
        // -----------------------------------------------------------------------------------------------------

        $initialesProjet = strtoupper(substr($project->name, 0, 2));
        $moisCourant = now()->format('m');
        $anneeCourante = now()->year;

        $ordre = Requisition::where('project_id', $project->id)
            ->whereYear('created_at', $anneeCourante)
            ->whereMonth('created_at', now()->month)
            ->count() + 1;

        $numeroChronologique = sprintf('%s/%s/%03d', $initialesProjet, $moisCourant, $ordre);
        $isUrgent = $request->boolean('is_urgent');

        $conversion = DailyExchangeRate::convertToEur((float) $validated['montant_total'], $validated['devise']);

        $statusInitial = now()->day >= 20 && now()->day <= 25 ? 'draft' : 'finance_precheck';

        $requisition = Requisition::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'numero_requisition' => $numeroChronologique,
            'nature_requisition' => $validated['nature_requisition'],
            'projet' => $validated['projet'],
            'project_code' => $initialesProjet,
            'caisse_decaissement' => $validated['caisse_decaissement'],
            'devise' => $validated['devise'],
            'mode_paiement' => $validated['mode_paiement'],
            'beneficiaire_nom' => $validated['beneficiaire_nom'],
            'beneficiaire_adresse' => $validated['beneficiaire_adresse'],
            'beneficiaire_telephone' => $validated['beneficiaire_telephone'],
            'beneficiaire_email' => $validated['beneficiaire_email'],
            'numero_facture' => $validated['numero_facture'],
            'date_facture' => $validated['date_facture'],
            'observation' => $validated['observation'] ?? null,
            'derniere_observation' => null,
            'montant_total' => $validated['montant_total'],
            'montant_total_eur' => $conversion['montant_eur'],
            'taux_eur_usd' => $conversion['taux_eur_usd'],
            'taux_eur_cdf' => $conversion['taux_eur_cdf'],
            'is_urgent' => $isUrgent,
            'date_paiement' => $validated['date_paiement'] ?? null,
            'date_livraison' => $validated['date_livraison'] ?? null,
            'status' => $statusInitial,
        ]);

        $this->enregistrerSignature(
            $requisition,
            $user,
            'initiateur',
            'submitted',
            $statusInitial === 'finance_precheck'
                ? 'Soumission hors période (validation Finance préalable requise)'
                : ($isUrgent ? 'Soumission urgente' : 'Soumission initiale')
        );

        $roleInitial = $statusInitial === 'finance_precheck' ? 'finance' : 'project_manager';
        $labelInitial = $statusInitial === 'finance_precheck' ? 'Manager des Finances' : 'Manager de Projet';
        $this->notifierUtilisateur($user->id, 'Réquisition transmise', "Votre réquisition {$numeroChronologique} a été transmise au {$labelInitial}.", $isUrgent);
        $this->notifierRole(
            roleCible: $roleInitial,
            projectId: $statusInitial === 'finance_precheck' ? null : $project->id,
            titre: $statusInitial === 'finance_precheck'
                ? 'Réquisition hors période : visa Finance préalable requis'
                : ($isUrgent ? 'URGENT : Réquisition à viser' : 'Nouvelle réquisition à viser'),
            message: $statusInitial === 'finance_precheck'
                ? "La réquisition {$numeroChronologique} ({$requisition->montant_total} {$requisition->devise}) doit recevoir un visa Finance préalable avant le circuit normal."
                : "La réquisition {$numeroChronologique} ({$requisition->montant_total} {$requisition->devise}) de {$user->name} attend votre visa.",
            urgent: $isUrgent
        );

        foreach ($request->input('lignes', []) as $ligneIndex => $ligne) {
            $demande = Demande::create([
                'requisition_id' => $requisition->id,
                'activite' => $ligne['activite'],
                'entreprise' => 'BP RDC',
                'donneur' => $ligne['donneur'],
                'code_all_budget' => $ligne['code_all_budget'],
                'code_allocation' => null,
                'nature' => $ligne['nature'],
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
                if (! $uploadedFile || ! $uploadedFile instanceof UploadedFile || ! $uploadedFile->isValid()) continue;

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
                'nullable',
                'string',
                'max:255',
                Rule::exists('cash_registers', 'name')->where('is_active', true),
            ],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
            
            'articles' => ['nullable', 'array'],
            'articles.*.id' => ['required_with:articles', 'string'],
            'articles.*.activite' => ['required_with:articles', 'string', 'max:255'],
            'articles.*.quantiteOuDuree' => ['required_with:articles', 'numeric', 'min:0'],
            'articles.*.prixUnitaire' => ['required_with:articles', 'numeric', 'min:0'],
            'articles.*.code_allocation' => ['nullable', 'string', 'max:255'],
            
            'articles.*.splits' => ['nullable', 'array'],
            'articles.*.splits.*.code_allocation' => ['required_with:articles.*.splits', 'string', 'max:255'],
            'articles.*.splits.*.montant' => ['required_with:articles.*.splits', 'numeric', 'min:0.01'],
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

        $resultat = DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            abort_unless(
                $lockedRequisition->project_id === $user->project_id
                    && in_array($lockedRequisition->status, ['draft', 'visa_mp', 'returned_to_project_manager']),
                403,
                'La réquisition n\'est pas dans un statut en attente de l\'arbitrage du Manager de Projet.'
            );

            if ($validated['decision'] === 'approve') {
                $caisseChoisie = $validated['caisse_decaissement'] ?? $lockedRequisition->caisse_decaissement;
                $caisseModel = CashRegister::where('name', $caisseChoisie)->first();
                if ($caisseModel && $caisseModel->devise !== $lockedRequisition->devise) {
                    return [
                        'success' => false,
                        'error' => "Incohérence : la caisse « {$caisseModel->name} » fonctionne en {$caisseModel->devise}, alors que la réquisition est en {$lockedRequisition->devise}."
                    ];
                }

                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                $nouveauMontantTotal = 0;
                $activeRate = DailyExchangeRate::getActiveRate();

                if (! empty($validated['articles'])) {
                    foreach ($validated['articles'] as $artData) {
                        $demande = $demandes->get($artData['id']);
                        if (! $demande) continue;

                        $qte = (float) $artData['quantiteOuDuree'];
                        $pu = (float) $artData['prixUnitaire'];
                        $totalLigne = round($qte * $pu, 2);
                        $nouveauMontantTotal += $totalLigne;

                        $codePrincipal = trim((string) ($artData['code_allocation'] ?? ''));
                        $splitsData = $artData['splits'] ?? [];

                        if (! empty($splitsData)) {
                            $sommeSplits = round(array_sum(array_column($splitsData, 'montant')), 2);
                            if (abs($sommeSplits - $totalLigne) > 0.05) {
                                return [
                                    'success' => false,
                                    'error' => "Erreur de ventilation sur « {$demande->activite} » : La somme des montants ventilés ({$sommeSplits} {$lockedRequisition->devise}) doit être exactement égale au total de la ligne ({$totalLigne} {$lockedRequisition->devise})."
                                ];
                            }

                            foreach ($splitsData as $split) {
                                $codeNorm = BudgetLine::normalizeCode($split['code_allocation']);
                                $bLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->first();

                                $convSplit = DailyExchangeRate::convertToEur((float) $split['montant'], $lockedRequisition->devise, $activeRate);
                                if ($bLine && $convSplit['montant_eur'] > (float) $bLine->solde) {
                                    return [
                                        'success' => false,
                                        'error' => "Dépassement sur code ventilé {$bLine->code} : Nécessite {$convSplit['montant_eur']} EUR ({$split['montant']} {$lockedRequisition->devise}), solde dispo : {$bLine->solde} EUR."
                                    ];
                                }
                            }

                            $demande->splits()->delete();
                            foreach ($splitsData as $split) {
                                $codeNorm = BudgetLine::normalizeCode($split['code_allocation']);
                                $libelle = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->value('libelle') ?? 'Ventilation';

                                DemandeSplit::create([
                                    'demande_id' => $demande->id,
                                    'code_allocation' => trim($split['code_allocation']),
                                    'libelle_allocation' => $libelle,
                                    'montant' => (float) $split['montant'],
                                ]);
                            }

                            $codePrincipal = $splitsData[0]['code_allocation'];
                        } else {
                            $demande->splits()->delete();

                            if (! empty($codePrincipal)) {
                                $codeNorm = BudgetLine::normalizeCode($codePrincipal);
                                $bLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->first();

                                $convLigne = DailyExchangeRate::convertToEur($totalLigne, $lockedRequisition->devise, $activeRate);
                                if ($bLine && $convLigne['montant_eur'] > (float) $bLine->solde) {
                                    return [
                                        'success' => false,
                                        'error' => "Dépassement sur {$bLine->code} : Nécessite {$convLigne['montant_eur']} EUR ({$totalLigne} {$lockedRequisition->devise}), solde dispo : {$bLine->solde} EUR."
                                    ];
                                }
                            }
                        }

                        $isService = strtolower($lockedRequisition->nature_requisition) === 'service';
                        $demande->update([
                            'activite' => $artData['activite'],
                            'quantite' => $isService ? 0 : $qte,
                            'duree' => $isService ? $qte : 0,
                            'frais_unitaire' => $pu,
                            'total_ligne' => $totalLigne,
                            'code_allocation' => $codePrincipal,
                            'code_all_budget' => $codePrincipal,
                            'libelle_allocation' => BudgetLine::where('project_id', $lockedRequisition->project_id)
                                ->whereRaw('LOWER(TRIM(code)) = ?', [BudgetLine::normalizeCode($codePrincipal)])
                                ->value('libelle') ?? $demande->libelle_allocation,
                        ]);
                    }
                } else {
                    $nouveauMontantTotal = (float) $lockedRequisition->montant_total;
                }

                $conversion = DailyExchangeRate::convertToEur($nouveauMontantTotal, $lockedRequisition->devise, $activeRate);

                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : "Visa MP accordé. Caisse : {$caisseChoisie}";

                $lockedRequisition->update([
                    'status' => 'visa_finance',
                    'caisse_decaissement' => $caisseChoisie,
                    'montant_total' => $nouveauMontantTotal,
                    'montant_total_eur' => $conversion['montant_eur'],
                    'taux_eur_usd' => $conversion['taux_eur_usd'],
                    'taux_eur_cdf' => $conversion['taux_eur_cdf'],
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
                        message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le Manager de Projet et transmise aux Finances."
                    );
                }

                $this->notifierRole(
                    roleCible: 'finance',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Réquisition pour visa financier' : 'Nouvelle réquisition pour examen financier',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->projet}) est en attente de visa du Manager des Finances.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return ['success' => true];
            }

            $lockedRequisition->update([
                'status' => 'returned_to_project_manager',
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
                titre: 'Réquisition à reprendre après rejet',
                message: "La réquisition {$lockedRequisition->numero_requisition} a été rejetée et renvoyée au Manager de Projet : {$validated['motif_rejet']}"
            );
            $this->notifierRole(
                roleCible: 'project_manager',
                projectId: $lockedRequisition->project_id,
                titre: 'Réquisition à reprendre après rejet',
                message: "La réquisition {$lockedRequisition->numero_requisition} doit être reprise après rejet : {$validated['motif_rejet']}"
            );

            return ['success' => true];
        });

        if (isset($resultat['success']) && ! $resultat['success']) {
            return Redirect::back()->withErrors([
                'general' => $resultat['error'],
                'pin' => $resultat['error'],
            ]);
        }

        $action = $validated['decision'] === 'approve' ? 'approuvée' : 'rejetée';
        $commentaire = $validated['decision'] === 'approve' ? ($validated['observation'] ?? null) : ($validated['motif_rejet'] ?? null);
        $this->envoyerMailStatut($requisition, $action, 'Manager de Projet', $commentaire);

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa Manager de Projet accordé avec imputations. Dossier transmis au Manager des Finances.'
                : 'Réquisition renvoyée au Manager de Projet après rejet.'
        );
    }

    public function adminDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('admin_manager'), 403, 'Action réservée au Manager de l\'Administration (PAM).');

        abort_unless(
            $requisition->status === 'visa_pam',
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
                $lockedRequisition->status === 'visa_pam',
                403,
                'Cette réquisition n’est plus en attente de visa du PAM.'
            );

            if ($validated['decision'] === 'approve') {
                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : 'Visa de contrôle administratif (PAM) accordé.';

                $lockedRequisition->update([
                    'status' => 'visa_admin',
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
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été visée par le PAM et transmise à la Direction."
                );

                $this->notifierRole(
                    roleCible: 'director',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Réquisition visée par le PAM' : 'Nouvelle réquisition pour approbation de la Direction',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) est prête pour votre approbation finale.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return;
            }

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

        $action = $validated['decision'] === 'approve' ? 'approuvée' : 'rejetée';
        $commentaire = $validated['decision'] === 'approve' ? ($validated['observation'] ?? null) : ($validated['motif_rejet'] ?? null);
        $this->envoyerMailStatut($requisition, $action, 'Manager Administratif (PAM)', $commentaire);

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Visa administratif (PAM) accordé avec succès. Transmis à la Direction.'
                : 'Dossier renvoyé au Manager de Projet pour arbitrage.'
        );
    }

    public function financeDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('finance'), 403, 'Action réservée au Manager des Finances.');

        abort_unless(
            in_array($requisition->status, ['finance_precheck', 'visa_finance'], true),
            403,
            'Cette réquisition n’est pas en attente de visa du Manager des Finances.'
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
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
            
            'articles' => ['nullable', 'array'],
            'articles.*.id' => ['required_with:articles', 'string'],
            'articles.*.activite' => ['required_with:articles', 'string', 'max:255'],
            'articles.*.quantiteOuDuree' => ['required_with:articles', 'numeric', 'min:0'],
            'articles.*.prixUnitaire' => ['required_with:articles', 'numeric', 'min:0'],
            'articles.*.code_allocation' => ['nullable', 'string', 'max:255'],
            
            'articles.*.splits' => ['nullable', 'array'],
            'articles.*.splits.*.code_allocation' => ['required_with:articles.*.splits', 'string', 'max:255'],
            'articles.*.splits.*.montant' => ['required_with:articles.*.splits', 'numeric', 'min:0.01'],
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

        $resultat = DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();

            abort_unless(
                in_array($lockedRequisition->status, ['finance_precheck', 'visa_finance'], true),
                403,
                'Cette réquisition n’est plus en attente de visa financier.'
            );

            if ($lockedRequisition->status === 'finance_precheck' && $validated['decision'] === 'approve') {
                $lockedRequisition->update([
                    'status' => 'draft',
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $this->enregistrerSignature(
                    $lockedRequisition,
                    $user,
                    'finance',
                    'approved',
                    $validated['observation'] ?? 'Visa Finance préalable accordé.'
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Finance préalable accordé',
                    message: "La réquisition {$lockedRequisition->numero_requisition} est transmise au Manager de Projet pour suivre le circuit normal."
                );
                $this->notifierRole(
                    roleCible: 'project_manager',
                    projectId: $lockedRequisition->project_id,
                    titre: 'Réquisition prête pour le visa du Manager de Projet',
                    message: "Le visa Finance préalable de la réquisition {$lockedRequisition->numero_requisition} a été accordé."
                );

                return ['success' => true, 'precheck' => true];
            }

            if ($validated['decision'] === 'approve') {
                $caisseChoisie = $validated['caisse_decaissement'] ?? $lockedRequisition->caisse_decaissement;
                $caisseModel = CashRegister::where('name', $caisseChoisie)->first();
                if ($caisseModel && $caisseModel->devise !== $lockedRequisition->devise) {
                    return [
                        'success' => false,
                        'error' => "Incohérence : la caisse « {$caisseModel->name} » fonctionne en {$caisseModel->devise}, la réquisition est en {$lockedRequisition->devise}."
                    ];
                }

                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                $nouveauMontantTotal = 0;
                $activeRate = DailyExchangeRate::getActiveRate();

                if (! empty($validated['articles'])) {
                    foreach ($validated['articles'] as $artData) {
                        $demande = $demandes->get($artData['id']);
                        if (! $demande) continue;

                        $qte = (float) $artData['quantiteOuDuree'];
                        $pu = (float) $artData['prixUnitaire'];
                        $totalLigne = round($qte * $pu, 2);
                        $nouveauMontantTotal += $totalLigne;

                        $codePrincipal = trim((string) ($artData['code_allocation'] ?? ''));
                        $splitsData = $artData['splits'] ?? [];

                        if (! empty($splitsData)) {
                            $sommeSplits = round(array_sum(array_column($splitsData, 'montant')), 2);
                            if (abs($sommeSplits - $totalLigne) > 0.05) {
                                return [
                                    'success' => false,
                                    'error' => "Erreur de ventilation sur « {$demande->activite} » : La somme des montants ventilés ({$sommeSplits} {$lockedRequisition->devise}) doit être exactement égale au total de la ligne ({$totalLigne} {$lockedRequisition->devise})."
                                ];
                            }

                            foreach ($splitsData as $split) {
                                $codeNorm = BudgetLine::normalizeCode($split['code_allocation']);
                                $bLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->first();

                                $convSplit = DailyExchangeRate::convertToEur((float) $split['montant'], $lockedRequisition->devise, $activeRate);
                                if ($bLine && $convSplit['montant_eur'] > (float) $bLine->solde) {
                                    return [
                                        'success' => false,
                                        'error' => "Dépassement sur code ventilé {$bLine->code} : Nécessite {$convSplit['montant_eur']} EUR ({$split['montant']} {$lockedRequisition->devise}), solde dispo : {$bLine->solde} EUR."
                                    ];
                                }
                            }

                            $demande->splits()->delete();
                            foreach ($splitsData as $split) {
                                $codeNorm = BudgetLine::normalizeCode($split['code_allocation']);
                                $libelle = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->value('libelle') ?? 'Ventilation';

                                DemandeSplit::create([
                                    'demande_id' => $demande->id,
                                    'code_allocation' => trim($split['code_allocation']),
                                    'libelle_allocation' => $libelle,
                                    'montant' => (float) $split['montant'],
                                ]);
                            }

                            $codePrincipal = $splitsData[0]['code_allocation'];
                        } else {
                            $demande->splits()->delete();

                            if (! empty($codePrincipal)) {
                                $codeNorm = BudgetLine::normalizeCode($codePrincipal);
                                $bLine = BudgetLine::where('project_id', $lockedRequisition->project_id)
                                    ->whereRaw('LOWER(TRIM(code)) = ?', [$codeNorm])
                                    ->first();

                                $convLigne = DailyExchangeRate::convertToEur($totalLigne, $lockedRequisition->devise, $activeRate);
                                if ($bLine && $convLigne['montant_eur'] > (float) $bLine->solde) {
                                    return [
                                        'success' => false,
                                        'error' => "Dépassement sur {$bLine->code} : Nécessite {$convLigne['montant_eur']} EUR ({$totalLigne} {$lockedRequisition->devise}), solde dispo : {$bLine->solde} EUR."
                                    ];
                                }
                            }
                        }

                        $isService = strtolower($lockedRequisition->nature_requisition) === 'service';
                        $demande->update([
                            'activite' => $artData['activite'],
                            'quantite' => $isService ? 0 : $qte,
                            'duree' => $isService ? $qte : 0,
                            'frais_unitaire' => $pu,
                            'total_ligne' => $totalLigne,
                            'code_allocation' => $codePrincipal,
                            'code_all_budget' => $codePrincipal,
                            'libelle_allocation' => BudgetLine::where('project_id', $lockedRequisition->project_id)
                                ->whereRaw('LOWER(TRIM(code)) = ?', [BudgetLine::normalizeCode($codePrincipal)])
                                ->value('libelle') ?? $demande->libelle_allocation,
                        ]);
                    }
                } else {
                    $nouveauMontantTotal = (float) $lockedRequisition->montant_total;
                }

                $conversion = DailyExchangeRate::convertToEur($nouveauMontantTotal, $lockedRequisition->devise, $activeRate);

                $lockedRequisition->update([
                    'status' => 'visa_pam',
                    'caisse_decaissement' => $caisseChoisie,
                    'montant_total' => $nouveauMontantTotal,
                    'montant_total_eur' => $conversion['montant_eur'],
                    'taux_eur_usd' => $conversion['taux_eur_usd'],
                    'taux_eur_cdf' => $conversion['taux_eur_cdf'],
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $commentaireSignature = ! empty($validated['observation'])
                    ? $validated['observation']
                    : "Visa financier accordé avec ajustements comptables. Caisse : {$caisseChoisie}";

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
                    message: "Vous avez validé {$lockedRequisition->numero_requisition} avec succès."
                );

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Visa Financier accordé',
                    message: "Le visa financier a été accordé pour votre réquisition {$lockedRequisition->numero_requisition}. Transmise au PAM."
                );

                $this->notifierRole(
                    roleCible: 'admin_manager',
                    projectId: null,
                    titre: (bool) $lockedRequisition->is_urgent ? 'URGENT : Réquisition en attente de visa PAM' : 'Réquisition en attente de visa PAM',
                    message: "La réquisition {$lockedRequisition->numero_requisition} ({$lockedRequisition->montant_total} {$lockedRequisition->devise}) est prête pour votre visa administratif.",
                    urgent: (bool) $lockedRequisition->is_urgent
                );

                return ['success' => true];
            }

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

            return ['success' => true];
        });

        if (isset($resultat['success']) && ! $resultat['success']) {
            return Redirect::back()->withErrors([
                'general' => $resultat['error'],
                'pin' => $resultat['error'],
            ]);
        }

        if (!isset($resultat['success']) || $resultat['success'] === true) {
            $action = $validated['decision'] === 'approve' ? 'approuvée' : 'rejetée';
            $commentaire = $validated['decision'] === 'approve' ? ($validated['observation'] ?? null) : ($validated['motif_rejet'] ?? null);
            $this->envoyerMailStatut($requisition, $action, 'Département des Finances', $commentaire);
        }

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? (! empty($resultat['precheck'])
                    ? 'Visa Finance préalable accordé. Dossier transmis au Manager de Projet.'
                    : 'Visa financier accordé avec ajustements comptables enregistrés.')
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

        $approved = DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()->whereKey($requisition->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedRequisition->status === 'visa_admin', 403, 'Cette réquisition n’est plus en attente d’approbation finale.');

            $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;
            $signataireNom = $isInterim ? ($user->name.' (P.O. / Intérim)') : $user->name;

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update([
                    'status' => 'payment_request',
                    'derniere_observation' => $validated['observation'] ?? null,
                ]);

                $commentaireDefaut = $isInterim
                    ? 'Réquisition approuvée pour ordre / intérim par le Manager Administratif (PAM). Payment Request disponible.'
                    : 'Réquisition approuvée par la Direction. Payment Request disponible.';

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

                $this->notifierUtilisateur(
                    userId: $lockedRequisition->user_id,
                    titre: 'Réquisition approuvée — Payment Request disponible',
                    message: "Votre réquisition {$lockedRequisition->numero_requisition} a été approuvée par {$mentionAuteur}. Le Payment Request peut être téléchargé depuis votre suivi."
                );

                return true;
            }

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

            return false;
        });

        $paymentRequestEmailSent = false;
        if ($approved) {
            $requisition->refresh()->load('user');
            if ($requisition->user?->email) {
                try {
                    $requisition->user->notify(new PaymentRequestReady($requisition));
                    $paymentRequestEmailSent = true;
                } catch (\Throwable $exception) {
                    \Illuminate\Support\Facades\Log::error('Échec d’envoi du Payment Request à l’initiateur.', [
                        'requisition_id' => $requisition->id,
                        'user_id' => $requisition->user_id,
                        'exception' => $exception->getMessage(),
                    ]);
                }
            } else {
                \Illuminate\Support\Facades\Log::warning('Payment Request non envoyé : l’initiateur n’a pas d’adresse e-mail.', [
                    'requisition_id' => $requisition->id,
                    'user_id' => $requisition->user_id,
                ]);
            }
        }

        $action = $validated['decision'] === 'approve' ? 'approuvée' : 'rejetée';
        $commentaire = $validated['decision'] === 'approve' ? ($validated['observation'] ?? null) : ($validated['motif_rejet'] ?? null);
        $this->envoyerMailStatut($requisition, $action, 'Direction Générale', $commentaire);

        $isInterim = ! $user->hasRole('director') && (bool) $user->is_director_interim;

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? ($isInterim
                    ? ($paymentRequestEmailSent
                        ? 'Réquisition approuvée pour ordre / intérim. Le Payment Request a été envoyé par e-mail à l’initiateur.'
                        : 'Réquisition approuvée pour ordre / intérim, mais le Payment Request n’a pas pu être envoyé par e-mail.')
                    : ($paymentRequestEmailSent
                        ? 'Réquisition approuvée. Le Payment Request a été envoyé par e-mail à l’initiateur.'
                        : 'Réquisition approuvée, mais le Payment Request n’a pas pu être envoyé par e-mail.'))
                : 'Dossier rejeté par la Direction et renvoyé au Manager de Projet.'
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
            'draft', 'visa_mp' => 'visa_mp',
            'finance_precheck' => 'finance_precheck',
            'urgent_direction' => 'approbation_direction',
            'returned_to_beneficiary', 'returned_to_urgent_initiator' => 'brouillon',
            'returned_to_project_manager', 'returned_to_finance', 'returned_to_admin_manager' => 'visa_mp',
            'visa_finance' => 'controle_finance',
            'visa_pam' => 'visa_pam',
            'controle_finance' => 'controle_finance',
            'visa_admin', 'approbation_direction' => 'approbation_direction',
            'decaissement_caisse', 'decaisse', 'cloture' => 'payment_request',
            'payment_request' => 'payment_request',
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
            'demandes.splits',
            'signatures.user',
            'project',
            'user',
        ]);

        $pdf = Pdf::loadView('pdf.requisition', compact('requisition'))
            ->setPaper('a4', 'landscape');

        $nomFichier = 'Requisition_'.str_replace('/', '-', $requisition->numero_requisition).'.pdf';

        return $pdf->download($nomFichier);
    }

    public function generatePaymentRequestPdf(Request $request, Requisition $requisition)
    {
        $user = $request->user();
        abort_unless($requisition->status === 'payment_request', 404, 'Le Payment Request sera disponible après validation de la Direction.');

        $isAuthorized = $requisition->user_id === $user->id
            || $user->hasRole('admin')
            || $user->hasRole('finance')
            || $user->hasRole('admin_manager')
            || $user->canApproveAsDirector()
            || ($user->hasRole('project_manager') && $user->project_id === $requisition->project_id);

        abort_unless($isAuthorized, 403, 'Vous n’êtes pas autorisé à consulter ce Payment Request.');

        $document = app(PaymentRequestDocument::class);

        return response()->streamDownload(
            fn () => print $document->render($requisition),
            $document->filename($requisition),
            ['Content-Type' => 'application/pdf']
        );
    }

    protected function envoyerMailStatut(Requisition $requisition, string $action, string $etape, ?string $commentaire = null): void
    {
        try {

            dispatch(function () use ($requisition, $action, $etape, $commentaire) {
                try {
                    $requisition->loadMissing('user');
                    $usersToNotify = collect();


                    $pm = User::role('project_manager')->where('project_id', $requisition->project_id)->first();
                    if ($pm) {
                        $usersToNotify->push($pm);
                    }

                    $nextRole = match ($requisition->status) {
                        'visa_finance' => 'finance',
                        'visa_pam' => 'admin_manager',
                        'visa_admin', 'urgent_direction' => 'director',
                        default => null,
                    };

                    if ($nextRole) {
                        $nextApprovers = User::role($nextRole)->get();
                        $usersToNotify = $usersToNotify->merge($nextApprovers);
                    }

                    $usersToNotify = $usersToNotify->unique('id');

                    if ($usersToNotify->isNotEmpty()) {
                        foreach ($usersToNotify as $userToNotify) {
                            $userToNotify->notify(new \App\Notifications\RequisitionStatusUpdated($requisition, $action, $etape, $commentaire));
                        }
                    } elseif ($requisition->user) {

                        $requisition->user->notify(new \App\Notifications\RequisitionStatusUpdated($requisition, $action, $etape, $commentaire));
                    }

                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Erreur asynchrone (envoyerMailStatut) : " . $e->getMessage());
                }
            })->afterResponse();

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Erreur de préparation d'email de statut : " . $e->getMessage());
        }
    }
}