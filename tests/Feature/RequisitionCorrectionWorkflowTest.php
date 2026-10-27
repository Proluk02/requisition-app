<?php

use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use App\Notifications\RequisitionReadyForDisbursement;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

function workflowUser(string $role, ?Project $project = null): User
{
    Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    $user = User::factory()->create([
        'status' => 'active',
        'project_id' => $project?->id,
    ]);
    $user->assignRole($role);

    return $user;
}

function workflowRequisition(User $initiator, Project $project, string $status, bool $urgent = false): Requisition
{
    return Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'WF-'.strtoupper(str_replace('_', '-', $status)),
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'caisse_decaissement' => 'EU',
        'devise' => 'USD',
        'montant_total' => 100,
        'status' => $status,
        'is_urgent' => $urgent,
    ]);
}

function workflowDemand(Requisition $requisition): Demande
{
    return Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Papier',
        'code_all_budget' => 'BUD-001',
        'nature' => 'Achat',
        'quantite' => 2,
        'duree' => 0,
        'unite' => 'Carton',
        'frais_unitaire' => 50,
        'total_ligne' => 100,
    ]);
}

function correctionPayload(Demande $demande): array
{
    return [
        'caisse_decaissement' => 'EU',
        'devise' => 'USD',
        'observation' => 'Correction effectuée',
        'articles' => [[
            'id' => $demande->id,
            'activite' => 'Papier corrigé',
            'code_all_budget' => 'BUD-002',
            'nature' => 'Achat',
            'quantiteOuDuree' => 2,
            'unite' => 'Carton',
            'prixUnitaire' => 55,
        ]],
    ];
}

beforeEach(function () {
    CashRegister::create([
        'name' => 'EU',
        'code' => 'EU',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_active' => true,
    ]);
});

it('shows initial cash deposits to Finance and allows rejection without opening the register', function () {
    $finance = workflowUser('finance');
    $finance->update(['signature_pin' => Hash::make('1234')]);
    $cashier = workflowUser('cashier');
    $cashRegister = CashRegister::create([
        'name' => 'Initial Deposit Register',
        'code' => 'INIT',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_approvisionnee' => false,
        'is_active' => true,
    ]);
    $movement = CashMovement::create([
        'cash_register_id' => $cashRegister->id,
        'cashier_id' => $cashier->id,
        'type' => 'entree',
        'is_approvisionnement_initial' => true,
        'is_approvisionnement' => true,
        'status_validation' => 'en_attente_finance',
        'pin_validated' => false,
        'numero_piece' => 'BEC-2026-901',
        'date_mouvement' => now()->toDateString(),
        'tiers_nom' => 'Banque locale',
        'montant' => 150,
        'devise' => 'USD',
        'montant_en_lettres' => 'Cent cinquante dollars',
        'motif' => 'Dotation initiale',
        'imputation' => '6.112.a',
        'mode_paiement' => 'Virement',
        'bordereau_banque_ref' => 'BR-901',
    ]);

    $this->actingAs($finance)
        ->get(route('finance.caisses.sessions'))
        ->assertInertia(fn ($page) => $page
            ->component('Finance/Caisses/Sessions')
            ->where('pendingApprovisionnements.0.id', $movement->id)
            ->where('pendingApprovisionnements.0.bordereau_banque_ref', 'BR-901')
        );

    $this->actingAs($finance)
        ->post(route('cashier.movement.validate-approvisionnement', $movement), [
            'decision' => 'reject',
            'pin' => '1234',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('cash_movements', [
        'id' => $movement->id,
        'status_validation' => 'rejete',
        'validated_by' => $finance->id,
        'pin_validated' => false,
    ]);
    $this->assertDatabaseHas('cash_registers', [
        'id' => $cashRegister->id,
        'is_approvisionnee' => false,
        'solde_actuel' => 0,
    ]);
});

it('validates an initial cash deposit and makes the register eligible for opening', function () {
    $finance = workflowUser('finance');
    $finance->update(['signature_pin' => Hash::make('1234')]);
    $cashier = workflowUser('cashier');
    $cashRegister = CashRegister::create([
        'name' => 'Approved Deposit Register',
        'code' => 'APPROVED',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_approvisionnee' => false,
        'is_active' => true,
    ]);
    $cashRegister->cashiers()->attach($cashier->id);
    $movement = CashMovement::create([
        'cash_register_id' => $cashRegister->id,
        'cashier_id' => $cashier->id,
        'type' => 'entree',
        'is_approvisionnement_initial' => true,
        'is_approvisionnement' => true,
        'status_validation' => 'en_attente_finance',
        'pin_validated' => false,
        'numero_piece' => 'BEC-2026-902',
        'date_mouvement' => now()->toDateString(),
        'tiers_nom' => 'Banque locale',
        'montant' => 250,
        'devise' => 'USD',
        'montant_en_lettres' => 'Deux cent cinquante dollars',
        'motif' => 'Dotation initiale',
        'imputation' => '6.112.a',
        'mode_paiement' => 'Virement',
    ]);

    $this->actingAs($finance)
        ->post(route('cashier.movement.validate-approvisionnement', $movement), [
            'decision' => 'approve',
            'pin' => '1234',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('cash_movements', [
        'id' => $movement->id,
        'status_validation' => 'valide',
        'validated_by' => $finance->id,
        'pin_validated' => true,
    ]);
    $this->assertDatabaseHas('cash_registers', [
        'id' => $cashRegister->id,
        'is_approvisionnee' => true,
        'solde_initial_dotation' => 250,
        'solde_actuel' => 250,
    ]);

    $this->actingAs($cashier)
        ->post(route('cashier.session.request-opening', $cashRegister), [
            'observation' => 'Première ouverture après validation de dotation',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('cash_register_sessions', [
        'cash_register_id' => $cashRegister->id,
        'cashier_id' => $cashier->id,
        'status' => 'en_attente_autorisation',
        'solde_ouverture' => 250,
        'approvisionnement_movement_id' => $movement->id,
    ]);
});

it('returns a project-manager rejection to the beneficiary for correction and resubmission', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $manager = workflowUser('project_manager', $project);
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'draft');
    $requisition->update(['observation' => 'Achat de fournitures']);
    $demande = workflowDemand($requisition);

    $this->actingAs($manager)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Corriger la quantité',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_beneficiary']);
    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'observation' => 'Achat de fournitures',
    ]);
    expect($requisition->signatures()->where('action', 'rejected')->value('commentaire'))
        ->toBe('Corriger la quantité');

    $this->actingAs($beneficiary)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'draft']);
    $this->assertDatabaseHas('demandes', ['id' => $demande->id, 'activite' => 'Papier corrigé']);

    $this->actingAs($manager)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Nouvelle correction demandée',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_beneficiary']);
});

it('rejects a project manager decision using an inactive cash register', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $manager = workflowUser('project_manager', $project);
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'draft');
    $demande = workflowDemand($requisition);
    CashRegister::create([
        'name' => 'Caisse inactive',
        'code' => 'OFF',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_active' => false,
    ]);

    $this->actingAs($manager)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'approve',
            'pin' => '1234',
            'caisse_decaissement' => 'Caisse inactive',
            'allocations' => [[
                'demande_id' => $demande->id,
                'code_allocation' => 'BUD-001',
            ]],
        ])
        ->assertSessionHasErrors('caisse_decaissement');

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'draft',
    ]);
});

it('keeps rejection history out of the cashier exit voucher observation', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $cashier = workflowUser('cashier');
    $cashier->update(['signature_pin' => Hash::make('1234')]);
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'decaissement_caisse');
    $requisition->update([
        'observation' => "Achat de fournitures\nMotif rejet Finance: correction antérieure\nMotif rejet Direction: ancienne décision",
    ]);
    $demande = workflowDemand($requisition);
    $demande->update(['code_allocation' => 'BUD-001']);
    $cashRegister = CashRegister::where('name', 'EU')->firstOrFail();
    $session = CashRegisterSession::create([
        'cash_register_id' => $cashRegister->id,
        'cashier_id' => $cashier->id,
        'date_session' => now()->toDateString(),
        'solde_ouverture' => 1000,
        'total_entrees' => 0,
        'total_sorties' => 0,
        'status' => 'ouverte',
        'opened_at' => now(),
    ]);

    $this->actingAs($cashier)
        ->patch(route('requisitions.cashier-disburse', $requisition), [
            'mode_paiement' => 'Espèces',
            'montant_en_lettres' => 'Cent dollars',
            'observation' => null,
            'pin' => '1234',
        ])
        ->assertRedirect();

    $movement = CashMovement::where('requisition_id', $requisition->id)->firstOrFail();
    expect($movement->motif)->toBe('En règlement de : Achat de fournitures')
        ->and($movement->session_id)->toBe($session->id);
});

it('stores a new supporting document uploaded with a requisition correction', function () {
    Storage::fake('public');
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    workflowUser('project_manager', $project);
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'returned_to_beneficiary');
    $demande = workflowDemand($requisition);
    $file = UploadedFile::fake()->create('devis.pdf', 100, 'application/pdf');
    $payload = correctionPayload($demande);
    $payload['articles'][0]['justificatifs'] = [[
        'description' => 'Devis fournisseur',
        'date' => '2026-10-08',
        'montant' => 0,
        'file' => $file,
    ]];

    $this->actingAs($beneficiary)
        ->patch(route('requisitions.update', $requisition), $payload)
        ->assertRedirect();

    $justificatif = DemandeJustificatif::where('demande_id', $demande->id)->firstOrFail();
    expect($justificatif->original_name)->toBe('devis.pdf');
    Storage::disk('public')->assertExists($justificatif->file_path);
});

it('returns a Finance rejection to the project manager and resumes at Finance after correction', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $manager = workflowUser('project_manager', $project);
    $finance = workflowUser('finance');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'visa_mp');
    $demande = workflowDemand($requisition);

    $this->actingAs($finance)
        ->patch(route('requisitions.finance-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Code budgétaire incorrect',
        ])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_project_manager']);

    $this->actingAs($manager)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'visa_mp']);
    $this->assertDatabaseHas('demandes', ['id' => $demande->id, 'activite' => 'Papier corrigé']);
});

it('returns a PAM rejection to Finance and resumes at the PAM after correction', function () {
    Storage::fake('public');
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $pam = workflowUser('admin_manager');
    $finance = workflowUser('finance');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'controle_finance');
    $demande = workflowDemand($requisition);
    $attachment = UploadedFile::fake()->create('devis.pdf', 20, 'application/pdf');
    $attachmentPath = $attachment->store('requisition-attachments', 'public');
    $justificatif = DemandeJustificatif::create([
        'demande_id' => $demande->id,
        'description' => 'Devis fournisseur',
        'date' => now()->toDateString(),
        'montant' => 100,
        'file_path' => $attachmentPath,
        'original_name' => 'devis.pdf',
        'mime_type' => 'application/pdf',
    ]);

    $this->actingAs($pam)
        ->patch(route('requisitions.admin-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Justificatif administratif manquant',
        ])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_finance']);

    $this->actingAs($finance)
        ->get(route('finance.dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('requisitions.0.statusCode', 'returned_to_finance')
            ->where('requisitions.0.canCorrect', true)
            ->where('requisitions.0.motifRejet', 'Justificatif administratif manquant')
        );

    $this->actingAs($finance)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'controle_finance']);
    $this->assertDatabaseHas('requisition_signatures', [
        'requisition_id' => $requisition->id,
        'role_signataire' => 'finance',
        'action' => 'resubmitted',
    ]);

    $director = workflowUser('director');
    $this->actingAs($director)
        ->get(route('director.dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('requisitions.0.signatures.1.action', 'resubmitted')
            ->where('requisitions.0.signatures.1.commentaire', 'Correction après rejet : Justificatif administratif manquant')
        );

    $this->actingAs($pam)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('historyRequisitions.0.signatures.1.action', 'resubmitted')
            ->where('historyRequisitions.0.signatures.1.commentaire', 'Correction après rejet : Justificatif administratif manquant')
            ->where('requisitions.0.lignes.0.justificatifs.0.fileUrl', route('requisitions.justificatif.show', $justificatif))
        );

    $this->actingAs($pam)
        ->get(route('requisitions.justificatif.show', $justificatif))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

it('returns a Director rejection to the PAM and resumes at the Director after correction', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $director = workflowUser('director');
    $pam = workflowUser('admin_manager');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'visa_admin');
    $demande = workflowDemand($requisition);

    $this->actingAs($director)
        ->patch(route('requisitions.director-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Revoir le montant demandé',
        ])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_admin_manager']);

    $this->actingAs($pam)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'visa_admin']);
});

it('emails the initiator when a standard requisition is approved for disbursement', function () {
    Notification::fake();
    expect(is_subclass_of(RequisitionReadyForDisbursement::class, ShouldQueue::class))->toBeFalse();

    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $director = workflowUser('director');
    $director->update(['signature_pin' => Hash::make('1234')]);
    workflowUser('cashier');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'visa_admin');

    $this->actingAs($director)
        ->patch(route('requisitions.director-decision', $requisition), [
            'decision' => 'approve',
            'pin' => '1234',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'decaissement_caisse']);
    Notification::assertSentTo(
        $beneficiary,
        RequisitionReadyForDisbursement::class,
        function (RequisitionReadyForDisbursement $notification, array $channels) use ($beneficiary, $requisition) {
            $mail = $notification->toMail($beneficiary);
            $body = view($mail->view, $mail->viewData)->render();

            return $channels === ['mail']
                && $notification->numero === $requisition->numero_requisition
                && str_contains($body, '100,00 USD')
                && str_contains($body, 'background-color: #0B192C')
                && str_contains($body, 'background-color: #04326D');
        }
    );
});

it('returns an urgent requisition to its initiator and sends approval directly to the cashier', function () {
    Notification::fake();

    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $director = workflowUser('director');
    $cashier = workflowUser('cashier');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'urgent_direction', true);
    $demande = workflowDemand($requisition);

    $this->actingAs($director)
        ->patch(route('requisitions.urgent-director', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Préciser l’urgence',
        ])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_urgent_initiator']);
    Notification::assertNotSentTo($beneficiary, RequisitionReadyForDisbursement::class);

    $this->actingAs($beneficiary)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'urgent_direction']);

    $this->actingAs($director)
        ->patch(route('requisitions.urgent-director', $requisition), ['decision' => 'approve'])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'decaissement_caisse']);
    Notification::assertSentTo($beneficiary, RequisitionReadyForDisbursement::class);
});

it('shows the PAM a complete requisition history separately from its actionable queue', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $pam = workflowUser('admin_manager');
    $beneficiary = workflowUser('beneficiary');
    workflowRequisition($beneficiary, $project, 'controle_finance');
    workflowRequisition($beneficiary, $project, 'decaisse');

    $this->actingAs($pam)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('AdminManager/Dashboard')
            ->has('requisitions', 1)
            ->has('historyRequisitions', 2)
        );
});
