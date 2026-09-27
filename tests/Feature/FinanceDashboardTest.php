<?php

use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function createFinanceManager(Project $project): User
{
    Role::firstOrCreate(['name' => 'finance', 'guard_name' => 'web']);

    $finance = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
        'role' => 'finance',
    ]);
    $finance->assignRole('finance');

    return $finance;
}

function createFinanceRequisition(User $owner, Project $project, string $number, string $status = 'visa_mp'): Requisition
{
    return Requisition::create([
        'user_id' => $owner->id,
        'project_id' => $project->id,
        'numero_requisition' => $number,
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'montant_total' => 250,
        'status' => $status,
    ]);
}

function createFinanceDemand(Requisition $requisition, string $requestedCode = 'BUD-REQUESTED'): Demande
{
    return Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Fournitures',
        'code_all_budget' => $requestedCode,
        'nature' => 'Achat',
        'quantite' => 1,
        'frais_unitaire' => 250,
        'total_ligne' => 250,
    ]);
}

it('loads requisitions across projects and flags only visa_mp as actionable', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $otherProject = Project::create(['name' => 'AFYA BORA', 'full_name' => 'Santé de Qualité']);
    $finance = createFinanceManager($project);
    $staff = User::factory()->create();

    createFinanceRequisition($staff, $project, 'FIN-001', 'visa_mp');
    $validatedRequisition = createFinanceRequisition($staff, $project, 'FIN-002', 'controle_finance');
    $validatedRequisition->forceFill(['created_at' => now()->addMinute()])->save();
    createFinanceRequisition($staff, $otherProject, 'OTHER-001', 'visa_mp');

    $this->actingAs($finance)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Finance/Dashboard')
            ->has('requisitions', 3)
            ->where('requisitions', function ($rows) {
                $byNumber = collect($rows)->keyBy('numero');

                return $byNumber->has('OTHER-001')
                    && $byNumber->get('FIN-001')['statusCode'] === 'visa_mp'
                    && $byNumber->get('FIN-001')['canDecide'] === true
                    && $byNumber->get('FIN-002')['canDecide'] === false;
            })
        );
});

it('advances a same-project visa_mp requisition after finance approval', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $finance = createFinanceManager($project);
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $projectManager = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
        'role' => 'project_manager',
    ]);
    $projectManager->assignRole('project_manager');
    $staff = User::factory()->create();
    $requisition = createFinanceRequisition($staff, $project, 'FIN-APPROVE-001');
    $demande = createFinanceDemand($requisition);

    $this->actingAs($finance)
        ->patch('/requisitions/' . $requisition->id . '/finance-decision', [
            'decision' => 'approve',
            'allocations' => [[
                'demande_id' => $demande->id,
                'code_allocation' => 'BUD-FINANCE-001',
            ]],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'controle_finance',
    ]);
    $this->assertDatabaseHas('demandes', [
        'id' => $demande->id,
        'code_all_budget' => 'BUD-REQUESTED',
        'code_allocation' => 'BUD-FINANCE-001',
    ]);
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $staff->id,
        'type' => \App\Notifications\FinanceRequisitionApproved::class,
    ]);
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $projectManager->id,
        'type' => \App\Notifications\FinanceRequisitionApproved::class,
    ]);
});

it('rejects a visa_mp requisition with a mandatory finance rejection reason', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $finance = createFinanceManager($project);
    $staff = User::factory()->create();
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $projectManager = User::factory()->create([
        'project_id' => $project->id,
        'role' => 'project_manager',
        'status' => 'active',
    ]);
    $projectManager->assignRole('project_manager');
    $requisition = createFinanceRequisition($staff, $project, 'FIN-REJECT-001');

    $this->actingAs($finance)
        ->patch('/requisitions/' . $requisition->id . '/finance-decision', [
            'decision' => 'reject',
            'motif_rejet' => 'Imputation budgétaire incorrecte',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'draft',
    ]);
    expect($requisition->fresh()->observation)->toContain('Motif rejet Finance: Imputation budgétaire incorrecte');
    $this->assertDatabaseCount('notifications', 2);
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $staff->id,
        'type' => \App\Notifications\FinanceRequisitionRejected::class,
    ]);
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $projectManager->id,
        'type' => \App\Notifications\FinanceRequisitionRejected::class,
    ]);

    $this->actingAs($projectManager)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('notifications.0.titre', 'Réquisition à corriger')
            ->where('notifications.0.message', fn ($message) => str_contains($message, 'Imputation budgétaire incorrecte'))
        );

    $this->actingAs($finance)
        ->get(route('finance.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('requisitions.0.statusCode', 'draft')
            ->where('requisitions.0.statusLabel', 'Renvoyée en correction')
            ->where('requisitions.0.financeRejected', true)
            ->where('requisitions.0.canDecide', false)
        );
});

it('does not approve or partially allocate when Finance omits an allocation code', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $finance = createFinanceManager($project);
    $staff = User::factory()->create();
    $requisition = createFinanceRequisition($staff, $project, 'FIN-PARTIAL-ALLOCATION-001');
    $firstDemand = createFinanceDemand($requisition, 'BUD-REQUESTED-1');
    $secondDemand = createFinanceDemand($requisition, 'BUD-REQUESTED-2');

    $this->actingAs($finance)
        ->patch('/requisitions/' . $requisition->id . '/finance-decision', [
            'decision' => 'approve',
            'allocations' => [[
                'demande_id' => $firstDemand->id,
                'code_allocation' => 'BUD-FINANCE-001',
            ]],
        ])
        ->assertStatus(422);

    $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'status' => 'visa_mp']);
    $this->assertDatabaseHas('demandes', ['id' => $firstDemand->id, 'code_allocation' => null]);
    $this->assertDatabaseHas('demandes', ['id' => $secondDemand->id, 'code_allocation' => null]);
});

it('allows finance decisions across projects but forbids statuses other than visa_mp', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $otherProject = Project::create(['name' => 'AFYA BORA', 'full_name' => 'Santé de Qualité']);
    $finance = createFinanceManager($project);
    $staff = User::factory()->create();
    $otherProjectRequisition = createFinanceRequisition($staff, $otherProject, 'FIN-OTHER-001');
    $alreadyReviewed = createFinanceRequisition($staff, $project, 'FIN-REVIEWED-001', 'controle_finance');
    $otherProjectDemand = createFinanceDemand($otherProjectRequisition);

    $this->actingAs($finance)
        ->patch('/requisitions/' . $otherProjectRequisition->id . '/finance-decision', [
            'decision' => 'approve',
            'allocations' => [[
                'demande_id' => $otherProjectDemand->id,
                'code_allocation' => 'BUD-GLOBAL-001',
            ]],
        ])
        ->assertRedirect();

    $this->patch('/requisitions/' . $alreadyReviewed->id . '/finance-decision', ['decision' => 'approve'])
        ->assertForbidden();

    $this->assertDatabaseHas('requisitions', ['id' => $otherProjectRequisition->id, 'status' => 'controle_finance']);
    $this->assertDatabaseHas('requisitions', ['id' => $alreadyReviewed->id, 'status' => 'controle_finance']);
});

it('forbids a non-finance role from using the finance decision endpoint', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $manager = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
        'role' => 'project_manager',
    ]);
    $manager->assignRole('project_manager');
    $staff = User::factory()->create();
    $requisition = createFinanceRequisition($staff, $project, 'FIN-WRONG-ROLE-001');

    $this->actingAs($manager)
        ->patch('/requisitions/' . $requisition->id . '/finance-decision', ['decision' => 'approve'])
        ->assertForbidden();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'visa_mp',
    ]);
});

it('allows finance to consult attachments across projects', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $otherProject = Project::create(['name' => 'AFYA BORA', 'full_name' => 'Santé de Qualité']);
    $finance = createFinanceManager($project);
    $staff = User::factory()->create();
    Storage::fake('public');

    $allowedRequisition = createFinanceRequisition($staff, $project, 'FIN-FILE-001');
    $otherRequisition = createFinanceRequisition($staff, $otherProject, 'FIN-FILE-002');

    $makeAttachment = function (Requisition $requisition, string $fileName): DemandeJustificatif {
        $demande = Demande::create([
            'requisition_id' => $requisition->id,
            'activite' => 'Fournitures',
            'code_all_budget' => 'BUD-001',
            'nature' => 'Achat',
            'quantite' => 1,
            'duree' => 0,
            'unite' => 'Lot',
            'frais_unitaire' => 250,
            'total_ligne' => 250,
        ]);
        $path = UploadedFile::fake()->create($fileName, 10, 'application/pdf')
            ->store('requisition-attachments', 'public');

        return DemandeJustificatif::create([
            'demande_id' => $demande->id,
            'description' => 'Facture',
            'date' => now()->toDateString(),
            'montant' => 250,
            'file_path' => $path,
            'original_name' => $fileName,
            'mime_type' => 'application/pdf',
        ]);
    };

    $allowedAttachment = $makeAttachment($allowedRequisition, 'allowed.pdf');
    $otherAttachment = $makeAttachment($otherRequisition, 'other.pdf');

    $this->actingAs($finance)
        ->get(route('requisitions.justificatif.show', $allowedAttachment))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $this->get(route('requisitions.justificatif.show', $otherAttachment))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});
