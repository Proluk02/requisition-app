<?php

use App\Models\CashRegister;
use App\Models\CashMovement;
use App\Models\CashRegisterSession;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
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
        'numero_requisition' => 'WF-' . strtoupper(str_replace('_', '-', $status)),
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
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $pam = workflowUser('admin_manager');
    $finance = workflowUser('finance');
    $beneficiary = workflowUser('beneficiary');
    $requisition = workflowRequisition($beneficiary, $project, 'controle_finance');
    $demande = workflowDemand($requisition);

    $this->actingAs($pam)
        ->patch(route('requisitions.admin-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Justificatif administratif manquant',
        ])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'returned_to_finance']);

    $this->actingAs($finance)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'controle_finance']);
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

it('returns an urgent requisition to its initiator and sends approval directly to the cashier', function () {
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

    $this->actingAs($beneficiary)
        ->patch(route('requisitions.update', $requisition), correctionPayload($demande))
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'urgent_direction']);

    $this->actingAs($director)
        ->patch(route('requisitions.urgent-director', $requisition), ['decision' => 'approve'])
        ->assertRedirect();
    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'decaissement_caisse']);
});

it('shows the PAM a complete requisition history separately from its actionable queue', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $pam = workflowUser('admin_manager');
    $beneficiary = workflowUser('beneficiary');
    workflowRequisition($beneficiary, $project, 'controle_finance');
    workflowRequisition($beneficiary, $project, 'decaisse');

    $this->actingAs($pam)
        ->get(route('dashboard'))
        ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('AdminManager/Dashboard')
            ->has('requisitions', 1)
            ->has('historyRequisitions', 2)
        );
});
