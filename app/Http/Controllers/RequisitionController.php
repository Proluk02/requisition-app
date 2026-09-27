<?php

namespace App\Http\Controllers;

use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use App\Notifications\FinanceRequisitionApproved;
use App\Notifications\FinanceRequisitionRejected;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class RequisitionController extends Controller
{
    public function index()
    {
        $requisitions = Requisition::with('demandes.justificatifs')
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Requisition $requisition) {
                return [
                    'id' => $requisition->id,
                    'numero' => $requisition->numero_requisition,
                    'projet' => $requisition->projet,
                    'site' => $requisition->project_code ?? '',
                    'nature' => $requisition->nature_requisition,
                    'caisse' => $requisition->caisse_decaissement ?? 'Caisse principale',
                    'devise' => $requisition->devise,
                    'montantTotal' => (float) $requisition->montant_total,
                    'montantLettres' => '',
                    'dateSoumission' => $requisition->created_at?->format('Y-m-d') ?? '',
                    'observation' => $requisition->observation,
                    'etapeActuelle' => $this->mapStatusToWorkflow($requisition->status),
                    'articles' => $requisition->demandes->map(function (Demande $demande) {
                        $justificatifs = $demande->justificatifs()->get();

                        return [
                            'id' => $demande->id,
                            'activite' => $demande->activite,
                            'codeBudget' => $demande->code_all_budget,
                            'nature' => $demande->nature ?? 'Achat',
                            'quantiteOuDuree' => (float) ($demande->quantite ?: $demande->duree ?: 0),
                            'unite' => $demande->unite ?? '',
                            'prixUnitaire' => (float) $demande->frais_unitaire,
                            'total' => (float) $demande->total_ligne,
                            'justificatifsCount' => $justificatifs->count(),
                            'justificatifs' => $justificatifs->map(function ($justificatif) {
                                $fileUrl = $justificatif->file_path
                                    ? route('requisitions.justificatif.show', ['justificatif' => $justificatif->id])
                                    : null;

                                return [
                                    'id' => (string) $justificatif->id,
                                    'description' => $justificatif->description ?? $justificatif->original_name,
                                    'originalName' => $justificatif->original_name,
                                    'date' => $justificatif->date ?? now()->toDateString(),
                                    'montant' => (float) ($justificatif->montant ?? 0),
                                    'filePath' => $justificatif->file_path,
                                    'fileUrl' => $fileUrl,
                                    'mimeType' => $justificatif->mime_type,
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

        if (! $user) {
            abort(403);
        }

        $requisition = $justificatif->demande?->requisition;
        $requisitionOwnerId = $requisition?->user_id;

        $isAuthorized = $requisitionOwnerId === $user->id
            || $user->hasRole('admin')
            || ($user->hasRole('project_manager')
                && $user->project_id !== null
                && $user->project_id === $requisition?->project_id)
            || $user->hasRole('finance');

        if (! $isAuthorized) {
            abort(403, 'Vous n’êtes pas autorisé à consulter ce fichier.');
        }

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
        'articles.*.nature' => ['nullable', 'string', 'max:255'],
        'articles.*.quantiteOuDuree' => ['required', 'numeric', 'min:0'],
        'articles.*.unite' => ['nullable', 'string', 'max:255'],
        'articles.*.prixUnitaire' => ['required', 'numeric', 'min:0'],
        'articles.*.justificatifs' => ['sometimes', 'array'],
        'articles.*.justificatifs.*.description' => ['nullable', 'string', 'max:255'],
        'articles.*.justificatifs.*.date' => ['nullable', 'date'],
        'articles.*.justificatifs.*.montant' => ['nullable', 'numeric', 'min:0'],
        'articles.*.justificatifs.*.file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
    ]);

    $natureRequisition = $validated['nature_requisition'] ?? $requisition->nature_requisition;

    DB::transaction(function () use ($validated, $requisition, $request, $natureRequisition, $isProjectManagerForProject) {
        $demandes = $requisition->demandes()->get()->keyBy('id');
        abort_unless($demandes->count() === count($validated['articles']), 422, 'La liste des demandes est incomplète.');

        $montantTotal = 0;
        $observation = $validated['observation'] ?? null;
        $isFinanceReturned = $requisition->status === 'draft'
            && str_contains($requisition->observation ?? '', 'Motif rejet Finance:');

        if ($isFinanceReturned) {
            preg_match('/Motif rejet Finance:[^\r\n]*/', $requisition->observation ?? '', $rejectionNote);
            if (! empty($rejectionNote[0]) && ! str_contains($observation ?? '', $rejectionNote[0])) {
                $observation = trim(($observation ? $observation . PHP_EOL : '') . $rejectionNote[0]);
            }
            $observation = trim(($observation ? $observation . PHP_EOL : '') . 'Correction apportée par le Manager: ' . now()->toDateTimeString());
        }

        foreach ($validated['articles'] as $articleIndex => $article) {
            $demande = $demandes->get($article['id']);
            abort_unless($demande, 404);

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

            foreach ($request->file("articles.{$articleIndex}.justificatifs", []) as $justificatifIndex => $justificatifFiles) {
                $uploadedFile = is_array($justificatifFiles)
                    ? ($justificatifFiles['file'] ?? null)
                    : $justificatifFiles;

                if (! $uploadedFile instanceof \Illuminate\Http\UploadedFile || ! $uploadedFile->isValid()) {
                    continue;
                }

                $metadata = $request->input("articles.{$articleIndex}.justificatifs.{$justificatifIndex}", []);
                $path = $uploadedFile->store('requisition-attachments', 'public');

                $demande->justificatifs()->create([
                    'description' => $metadata['description'] ?? $uploadedFile->getClientOriginalName(),
                    'date' => $metadata['date'] ?? now()->toDateString(),
                    'montant' => (float) ($metadata['montant'] ?? 0),
                    'file_path' => $path,
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'mime_type' => $uploadedFile->getClientMimeType(),
                ]);
            }
        }

        $newStatus = $requisition->status;

        if ($isProjectManagerForProject && $isFinanceReturned) {
            $newStatus = 'visa_mp';
        }

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

    public function managerDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('project_manager'), 403);
        abort_unless($user->project_id !== null, 403, 'Aucun projet n’est affecté à ce Manager.');
        abort_unless($user->project_id === $requisition->project_id, 403, 'Cette réquisition appartient à un autre projet.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'caisse_decaissement' => ['required_if:decision,approve', 'nullable', 'string', 'max:255'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
        ]);

        DB::transaction(function () use ($validated, $requisition, $user) {
            $lockedRequisition = Requisition::query()
                ->whereKey($requisition->id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($lockedRequisition->status === 'draft', 403, 'Cette réquisition a déjà été traitée.');
            abort_unless($user->project_id === $lockedRequisition->project_id, 403, 'Cette réquisition appartient à un autre projet.');

            $financeRejectionPosition = strrpos($lockedRequisition->observation ?? '', 'Motif rejet Finance:');
            $correctionPosition = strrpos($lockedRequisition->observation ?? '', 'Correction apportée par le Manager:');
            abort_unless(
                $financeRejectionPosition === false || ($correctionPosition !== false && $correctionPosition > $financeRejectionPosition),
                403,
                'Corrigez la réquisition avant de la revalider.'
            );

            $financeRejectionPosition = strrpos($lockedRequisition->observation ?? '', 'Motif rejet Finance:');
            $correctionPosition = strrpos($lockedRequisition->observation ?? '', 'Correction apportée par le Manager:');
            abort_unless(
                $financeRejectionPosition === false || ($correctionPosition !== false && $correctionPosition > $financeRejectionPosition),
                403,
                'Corrigez la réquisition avant de la revalider.'
            );

            if ($validated['decision'] === 'approve') {
                $lockedRequisition->update([
                    'status' => 'visa_mp',
                    'caisse_decaissement' => $validated['caisse_decaissement'],
                ]);

                return;
            }

            $newObservation = trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '') . 'Motif rejet MP: ' . $validated['motif_rejet']);

            $lockedRequisition->update([
                'status' => 'rejetee',
                'observation' => $newObservation,
            ]);
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Réquisition validée et transmise au niveau suivant.'
                : 'Réquisition rejetée.'
        );
    }

    public function financeDecision(Request $request, Requisition $requisition)
    {
        $user = $request->user();

        abort_unless($user?->hasRole('finance'), 403);
        abort_unless($requisition->status === 'visa_mp', 403, 'Cette réquisition n’est pas en attente de validation Finance.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'motif_rejet' => ['required_if:decision,reject', 'nullable', 'string', 'max:5000'],
            'allocations' => ['required_if:decision,approve', 'array', 'min:1'],
            'allocations.*.demande_id' => ['required', 'string', 'distinct'],
            'allocations.*.code_allocation' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($validated, $requisition) {
            $lockedRequisition = Requisition::query()
                ->whereKey($requisition->id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($lockedRequisition->status === 'visa_mp', 403, 'Cette réquisition n’est pas en attente de validation Finance.');

            if ($validated['decision'] === 'approve') {
                $demandes = $lockedRequisition->demandes()->lockForUpdate()->get()->keyBy('id');
                abort_unless($demandes->count() === count($validated['allocations']), 422, 'Un code budgétaire doit être attribué à chaque demande.');

                foreach ($validated['allocations'] as $allocation) {
                    $demande = $demandes->get($allocation['demande_id']);
                    abort_unless($demande, 422, 'Une demande de cette réquisition est introuvable.');
                    $demande->update(['code_allocation' => trim($allocation['code_allocation'])]);
                }

                $lockedRequisition->update(['status' => 'controle_finance']);
                $recipients = collect([$lockedRequisition->user])
                        ->merge(User::whereHas('roles', fn ($query) => $query->where('name', 'project_manager'))
                            ->where('project_id', $lockedRequisition->project_id)
                            ->get())
                    ->filter()
                    ->unique('id');

                Notification::send($recipients, new FinanceRequisitionApproved(
                    $lockedRequisition->id,
                    $lockedRequisition->numero_requisition
                ));

                return;
            }

            $observation = trim(($lockedRequisition->observation ? $lockedRequisition->observation . PHP_EOL : '')
                . 'Motif rejet Finance: ' . $validated['motif_rejet']);

            $lockedRequisition->update([
                'status' => 'draft',
                'observation' => $observation,
            ]);

            $recipients = collect([$lockedRequisition->user])
                    ->merge(User::whereHas('roles', fn ($query) => $query->where('name', 'project_manager'))
                        ->where('project_id', $lockedRequisition->project_id)
                        ->get())
                ->filter()
                ->unique('id');

            Notification::send($recipients, new FinanceRequisitionRejected(
                $lockedRequisition->id,
                $lockedRequisition->numero_requisition,
                $validated['motif_rejet']
            ));
        });

        return Redirect::back()->with(
            $validated['decision'] === 'approve' ? 'success' : 'error',
            $validated['decision'] === 'approve'
                ? 'Réquisition validée par Finance et transmise au niveau suivant.'
                : 'Réquisition renvoyée en brouillon pour correction.'
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'numero_requisition' => ['required', 'string'],
            'nature_requisition' => ['required', 'string'],
            'projet' => ['required', 'string', 'exists:projects,name'],
            'project_code' => ['nullable', 'string'],
            'caisse_decaissement' => ['nullable', 'string'],
            'devise' => ['required', 'string'],
            'observation' => ['nullable', 'string'],
            'montant_total' => ['required', 'numeric'],
            'lignes' => ['required', 'array'],
            'lignes.*.activite' => ['required', 'string'],
            'lignes.*.code_all_budget' => ['required', 'string'],
            'lignes.*.nature' => ['nullable', 'string'],
            'lignes.*.quantite' => ['nullable', 'numeric'],
            'lignes.*.duree' => ['nullable', 'numeric'],
            'lignes.*.unite' => ['nullable', 'string'],
            'lignes.*.frais_unitaire' => ['required', 'numeric'],
            'lignes.*.total_ligne' => ['required', 'numeric'],
            'lignes.*.justificatifs' => ['nullable', 'array'],
        ]);

        $project = Project::where('name', $validated['projet'])->firstOrFail();
        $user = $request->user();

        if ($user->hasRole('project_manager')) {
            abort_unless($user->project_id !== null && $user->project_id === $project->id, 403, 'Vous ne pouvez créer une réquisition que pour votre projet.');
        }

        $requisition = Requisition::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'numero_requisition' => $validated['numero_requisition'],
            'nature_requisition' => $validated['nature_requisition'],
            'projet' => $validated['projet'],
            'project_code' => $validated['project_code'] ?? null,
            'caisse_decaissement' => $validated['caisse_decaissement'] ?? null,
            'devise' => $validated['devise'],
            'observation' => $validated['observation'] ?? null,
            'montant_total' => $validated['montant_total'],
            'status' => $user->hasRole('project_manager') ? 'visa_mp' : 'draft',
        ]);

        foreach ($request->input('lignes', []) as $ligneIndex => $ligne) {
            $demande = Demande::create([
                'requisition_id' => $requisition->id,
                'activite' => $ligne['activite'],
                'code_all_budget' => $ligne['code_all_budget'],
                'nature' => $ligne['nature'] ?? null,
                'quantite' => $ligne['quantite'] ?? 0,
                'duree' => $ligne['duree'] ?? 0,
                'unite' => $ligne['unite'] ?? null,
                'frais_unitaire' => $ligne['frais_unitaire'],
                'total_ligne' => $ligne['total_ligne'],
            ]);

            $rawJustificatifs = $request->input('lignes.' . $ligneIndex . '.justificatifs', []);
            $uploadedJustificatifs = $request->file('lignes.' . $ligneIndex . '.justificatifs', []);

            if (! is_array($rawJustificatifs)) {
                $rawJustificatifs = [$rawJustificatifs];
            }

            if (! is_array($uploadedJustificatifs)) {
                $uploadedJustificatifs = [$uploadedJustificatifs];
            }

            foreach ($rawJustificatifs as $justifIndex => $justifData) {
                $uploadedFile = null;

                if (isset($uploadedJustificatifs[$justifIndex]['file'])) {
                    $uploadedFile = $uploadedJustificatifs[$justifIndex]['file'];
                } elseif (isset($uploadedJustificatifs[$justifIndex])) {
                    $uploadedFile = $uploadedJustificatifs[$justifIndex];
                }

                $fileMeta = is_array($justifData) ? $justifData : [];
                $description = $fileMeta['description'] ?? ($uploadedFile ? $uploadedFile->getClientOriginalName() : 'Pièce jointe');
                $date = $fileMeta['date'] ?? now()->toDateString();
                $montant = (float) ($fileMeta['montant'] ?? 0);

                if (! $uploadedFile || ! $uploadedFile instanceof \Illuminate\Http\UploadedFile || ! $uploadedFile->isValid()) {
                    continue;
                }

                $path = $uploadedFile->store('requisition-attachments', 'public');

                DemandeJustificatif::create([
                    'demande_id' => $demande->id,
                    'description' => $description,
                    'date' => $date,
                    'montant' => $montant,
                    'file_path' => $path,
                    'original_name' => $uploadedFile->getClientOriginalName(),
                    'mime_type' => $uploadedFile->getClientMimeType(),
                ]);
            }
        }

        return Redirect::route('requisitions.index')->with('success', 'Réquisition enregistrée avec succès.');
    }

    protected function mapStatusToWorkflow(string $status): string
    {
        return match ($status) {
            'draft' => 'brouillon',
            'visa_mp' => 'visa_mp',
            'controle_finance' => 'controle_finance',
            'visa_admin' => 'visa_admin',
            'approbation_direction' => 'approbation_direction',
            'decaissement_caisse' => 'decaissement_caisse',
            'cloture' => 'cloture',
            'rejetee_finance' => 'controle_finance',
            default => 'brouillon',
        };
    }
}
