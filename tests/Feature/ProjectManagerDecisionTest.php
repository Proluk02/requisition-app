<?php

use App\Http\Controllers\RequisitionController;
use App\Models\Project;
use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

it('persists the project manager approval decision in the database', function () {
    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
        'description' => 'Project for testing',
    ]);

    Role::firstOrCreate(['name' => 'project_manager']);

    $manager = User::factory()->create([
        'name' => 'Project Manager',
        'project_id' => $project->id,
    ]);
    $manager->assignRole('project_manager');

    $staff = User::factory()->create();

    $requisition = Requisition::create([
        'user_id' => $staff->id,
        'project_id' => $project->id,
        'numero_requisition' => 'UB/09/101',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'project_code' => 'PRJ-001',
        'caisse_decaissement' => 'Caisse principale',
        'devise' => 'USD',
        'observation' => 'Test purchase',
        'montant_total' => 1500,
        'status' => 'draft',
    ]);

    $request = Request::create('/requisitions/' . $requisition->id . '/manager-decision', 'PATCH', [
        'decision' => 'approve',
        'caisse_decaissement' => 'Caisse principale',
    ]);
    $request->setUserResolver(fn () => $manager);

    $response = app(RequisitionController::class)->managerDecision($request, $requisition);

    $this->assertNotNull($response);
    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'visa_mp',
        'caisse_decaissement' => 'Caisse principale',
    ]);
});

it('forbids a non-manager from deciding a requisition', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
    ]);
    $staff = User::factory()->create(['status' => 'active']);
    $staff->assignRole('beneficiary');
    $requisition = Requisition::create([
        'user_id' => $staff->id,
        'project_id' => $project->id,
        'numero_requisition' => 'UB/09/102',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'montant_total' => 100,
        'status' => 'draft',
    ]);

    $this->actingAs($staff)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'approve',
            'caisse_decaissement' => 'EU',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'draft',
    ]);
});

it('forbids a project manager from deciding another project requisition', function () {
    $managerProject = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
    ]);
    $otherProject = Project::create([
        'name' => 'AFYA BORA',
        'full_name' => 'AFYA BORA',
    ]);

    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $manager = User::factory()->create([
        'status' => 'active',
        'project_id' => $managerProject->id,
    ]);
    $manager->assignRole('project_manager');

    $staff = User::factory()->create();
    $requisition = Requisition::create([
        'user_id' => $staff->id,
        'project_id' => $otherProject->id,
        'numero_requisition' => 'UB/09/103',
        'nature_requisition' => 'Achat',
        'projet' => $otherProject->name,
        'devise' => 'USD',
        'montant_total' => 100,
        'status' => 'draft',
    ]);

    $this->actingAs($manager)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'approve',
            'caisse_decaissement' => 'EU',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'draft',
    ]);
});

it('forbids a project manager from deciding a requisition that is no longer a draft', function () {
    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
    ]);

    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $manager = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
    ]);
    $manager->assignRole('project_manager');

    $staff = User::factory()->create();
    $requisition = Requisition::create([
        'user_id' => $staff->id,
        'project_id' => $project->id,
        'numero_requisition' => 'UB/09/104',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'montant_total' => 100,
        'status' => 'visa_mp',
    ]);

    $this->actingAs($manager)
        ->patch(route('requisitions.manager-decision', $requisition), [
            'decision' => 'reject',
            'motif_rejet' => 'Retenter une décision déjà prise',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'visa_mp',
    ]);
});

it('loads project manager requisitions from the database and scopes them to the assigned project', function () {
    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
    ]);
    $otherProject = Project::create([
        'name' => 'AFYA BORA',
        'full_name' => 'AFYA BORA',
    ]);

    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $manager = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
    ]);
    $manager->assignRole('project_manager');

    $staff = User::factory()->create();
    foreach ([
        ['numero' => 'DB-REQ-001', 'projet' => 'Legacy display value', 'project_id' => $project->id],
        ['numero' => 'OTHER-REQ-001', 'projet' => $project->name, 'project_id' => $otherProject->id],
    ] as $data) {
        Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $data['project_id'],
            'numero_requisition' => $data['numero'],
            'nature_requisition' => 'Achat',
            'projet' => $data['projet'],
            'devise' => 'USD',
            'montant_total' => 100,
            'status' => 'draft',
        ]);
    }

    $this->actingAs($manager)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ProjectManager/Dashboard')
            ->has('requisitions', 1)
            ->where('requisitions.0.numero', 'DB-REQ-001')
            ->where('requisitions.0.statut', 'en_attente_mp')
        );
});

it('shows no requisitions to a project manager without an assigned project', function () {
    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'USIMAMIZI BORA',
    ]);

    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    $manager = User::factory()->create(['status' => 'active', 'project_id' => null]);
    $manager->assignRole('project_manager');

    $staff = User::factory()->create();
    Requisition::create([
        'user_id' => $staff->id,
        'project_id' => $project->id,
        'numero_requisition' => 'PRIVATE-REQ-001',
        'nature_requisition' => 'Achat',
        'projet' => 'USIMAMIZI BORA',
        'devise' => 'USD',
        'montant_total' => 100,
        'status' => 'draft',
    ]);

    $this->actingAs($manager)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ProjectManager/Dashboard')
            ->where('requisitions', [])
        );
});

    it('maps requisitions already transmitted beyond the project manager as validated', function () {
        $project = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
        ]);
        $manager->assignRole('project_manager');

        $staff = User::factory()->create();
        Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $project->id,
            'numero_requisition' => 'DB-REQ-002',
            'nature_requisition' => 'Achat',
            'projet' => $project->name,
            'devise' => 'USD',
            'montant_total' => 100,
            'status' => 'controle_finance',
        ]);

        $this->actingAs($manager)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProjectManager/Dashboard')
                ->where('requisitions.0.statut', 'valide_mp')
            );
    });

    it('forbids a project manager from consulting an attachment from another project', function () {
        $managerProject = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);
        $otherProject = Project::create([
            'name' => 'AFYA BORA',
            'full_name' => 'AFYA BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $managerProject->id,
        ]);
        $manager->assignRole('project_manager');

        $staff = User::factory()->create();
        $requisition = Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $otherProject->id,
            'numero_requisition' => 'OTHER-REQ-002',
            'nature_requisition' => 'Achat',
            'projet' => $otherProject->name,
            'devise' => 'USD',
            'montant_total' => 100,
            'status' => 'draft',
        ]);
        $demande = Demande::create([
            'requisition_id' => $requisition->id,
            'activite' => 'Matériel',
            'code_all_budget' => 'BUD-001',
            'nature' => 'Achat',
            'quantite' => 1,
            'duree' => 0,
            'unite' => 'Lot',
            'frais_unitaire' => 100,
            'total_ligne' => 100,
        ]);

        Storage::fake('public');
        $path = UploadedFile::fake()->create('facture.pdf', 10, 'application/pdf')->store('requisition-attachments', 'public');
        $justificatif = DemandeJustificatif::create([
            'demande_id' => $demande->id,
            'description' => 'Facture',
            'date' => now()->toDateString(),
            'montant' => 100,
            'file_path' => $path,
            'original_name' => 'facture.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $this->actingAs($manager)
            ->get(route('requisitions.justificatif.show', $justificatif))
            ->assertForbidden();
    });

    it('provides a project manager a protected consultation link for files in their project', function () {
        $project = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
        ]);
        $manager->assignRole('project_manager');

        $staff = User::factory()->create();
        $requisition = Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $project->id,
            'numero_requisition' => 'DB-REQ-003',
            'nature_requisition' => 'Achat',
            'projet' => $project->name,
            'devise' => 'USD',
            'montant_total' => 100,
            'status' => 'draft',
        ]);
        $demande = Demande::create([
            'requisition_id' => $requisition->id,
            'activite' => 'Matériel',
            'code_all_budget' => 'BUD-003',
            'nature' => 'Achat',
            'quantite' => 1,
            'duree' => 0,
            'unite' => 'Lot',
            'frais_unitaire' => 100,
            'total_ligne' => 100,
        ]);

        Storage::fake('public');
        $path = UploadedFile::fake()->create('facture-manager.pdf', 10, 'application/pdf')
            ->store('requisition-attachments', 'public');
        $justificatif = DemandeJustificatif::create([
            'demande_id' => $demande->id,
            'description' => 'Facture',
            'date' => now()->toDateString(),
            'montant' => 100,
            'file_path' => $path,
            'original_name' => 'facture-manager.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $this->actingAs($manager)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProjectManager/Dashboard')
                ->where('requisitions.0.lignes.0.justif.0.fileUrl', route('requisitions.justificatif.show', $justificatif))
            );

        $this->get(route('requisitions.justificatif.show', $justificatif))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    });

    it('shows requisitions with unrecognized workflow statuses instead of hiding them', function () {
        $project = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
        ]);
        $manager->assignRole('project_manager');

        $staff = User::factory()->create();
        Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $project->id,
            'numero_requisition' => 'DB-REQ-UNKNOWN',
            'nature_requisition' => 'Achat',
            'projet' => $project->name,
            'devise' => 'USD',
            'montant_total' => 100,
            'status' => 'verification_comptable',
        ]);

        $this->actingAs($manager)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProjectManager/Dashboard')
                ->has('requisitions', 1)
                ->where('requisitions.0.numero', 'DB-REQ-UNKNOWN')
                ->where('requisitions.0.statusCode', 'verification_comptable')
                ->where('requisitions.0.canDecide', false)
            );
    });

    it('creates a project manager requisition already past their own approval stage', function () {
        $project = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
        ]);
        $manager->assignRole('project_manager');

        $this->actingAs($manager)
            ->post(route('requisitions.store'), [
                'numero_requisition' => 'PM-DRAFT-001',
                'nature_requisition' => 'Achat',
                'projet' => $project->name,
                'project_code' => 'UB',
                'caisse_decaissement' => 'Caisse principale',
                'devise' => 'USD',
                'observation' => 'Créée par le Manager',
                'montant_total' => 120,
                'lignes' => [[
                    'activite' => 'Fournitures',
                    'code_all_budget' => 'BUD-001',
                    'nature' => 'Achat',
                    'quantite' => 2,
                    'duree' => 0,
                    'unite' => 'Lot',
                    'frais_unitaire' => 60,
                    'total_ligne' => 120,
                    'justificatifs' => [],
                ]],
            ])
            ->assertRedirect('/requisitions');

        $this->assertDatabaseHas('requisitions', [
            'numero_requisition' => 'PM-DRAFT-001',
            'user_id' => $manager->id,
            'project_id' => $project->id,
            'status' => 'visa_mp',
        ]);

        $this->actingAs($manager)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ProjectManager/Dashboard')
                ->where('requisitions.0.statusCode', 'visa_mp')
                ->where('requisitions.0.canDecide', false)
            );

        $managerRequisition = Requisition::where('numero_requisition', 'PM-DRAFT-001')->firstOrFail();
        $this->actingAs($manager)
            ->patch(route('requisitions.manager-decision', $managerRequisition), [
                'decision' => 'approve',
                'caisse_decaissement' => 'EU',
            ])
            ->assertForbidden();
    });

    it('forbids a project manager from creating a requisition for another project', function () {
        $assignedProject = Project::create([
            'name' => 'USIMAMIZI BORA',
            'full_name' => 'USIMAMIZI BORA',
        ]);
        $otherProject = Project::create([
            'name' => 'AFYA BORA',
            'full_name' => 'AFYA BORA',
        ]);

        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $assignedProject->id,
        ]);
        $manager->assignRole('project_manager');

        $this->actingAs($manager)
            ->post(route('requisitions.store'), [
                'numero_requisition' => 'PM-OTHER-001',
                'nature_requisition' => 'Achat',
                'projet' => $otherProject->name,
                'project_code' => 'AB',
                'caisse_decaissement' => 'Caisse principale',
                'devise' => 'USD',
                'observation' => null,
                'montant_total' => 100,
                'lignes' => [[
                    'activite' => 'Fournitures',
                    'code_all_budget' => 'BUD-001',
                    'nature' => 'Achat',
                    'quantite' => 1,
                    'duree' => 0,
                    'unite' => 'Lot',
                    'frais_unitaire' => 100,
                    'total_ligne' => 100,
                    'justificatifs' => [],
                ]],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('requisitions', [
            'numero_requisition' => 'PM-OTHER-001',
        ]);
    });

    it('allows a project manager to edit their own visa_mp requisition and add a file', function () {
        $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
            'role' => 'project_manager',
        ]);
        $manager->assignRole('project_manager');

        $requisition = Requisition::create([
            'user_id' => $manager->id,
            'project_id' => $project->id,
            'numero_requisition' => 'PM-EDIT-001',
            'nature_requisition' => 'Achat',
            'projet' => $project->name,
            'caisse_decaissement' => 'EU',
            'devise' => 'USD',
            'observation' => 'Avant modification',
            'montant_total' => 100,
            'status' => 'visa_mp',
        ]);
        $demande = Demande::create([
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
        Storage::fake('public');
        $file = UploadedFile::fake()->create('devis-corrige.pdf', 20, 'application/pdf');

        $this->actingAs($manager)
            ->post(route('requisitions.update', $requisition), [
                '_method' => 'patch',
                'caisse_decaissement' => 'Caisse principale',
                'devise' => 'EUR',
                'observation' => 'Demande mise à jour',
                'articles' => [[
                    'id' => $demande->id,
                    'activite' => 'Papier recyclé',
                    'code_all_budget' => 'BUD-002',
                    'nature' => 'Achat',
                    'quantiteOuDuree' => 3,
                    'unite' => 'Carton',
                    'prixUnitaire' => 40,
                    'justificatifs' => [[
                        'description' => 'Devis corrigé',
                        'date' => now()->toDateString(),
                        'montant' => 120,
                        'file' => $file,
                    ]],
                ]],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('requisitions', [
            'id' => $requisition->id,
            'status' => 'visa_mp',
            'caisse_decaissement' => 'Caisse principale',
            'devise' => 'EUR',
            'observation' => 'Demande mise à jour',
            'montant_total' => 120,
        ]);
        $this->assertDatabaseHas('demandes', [
            'id' => $demande->id,
            'activite' => 'Papier recyclé',
            'code_all_budget' => 'BUD-002',
            'quantite' => 3,
            'frais_unitaire' => 40,
            'total_ligne' => 120,
        ]);
        expect(DemandeJustificatif::where('demande_id', $demande->id)->count())->toBe(1);
        Storage::disk('public')->assertExists(DemandeJustificatif::where('demande_id', $demande->id)->firstOrFail()->file_path);
    });

    it('allows a project manager to edit a Finance-returned draft from another initiator', function () {
        $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create([
            'status' => 'active',
            'project_id' => $project->id,
            'role' => 'project_manager',
        ]);
        $manager->assignRole('project_manager');
        $staff = User::factory()->create();
        $requisition = Requisition::create([
            'user_id' => $staff->id,
            'project_id' => $project->id,
            'numero_requisition' => 'PM-RETURNED-001',
            'nature_requisition' => 'Achat',
            'projet' => $project->name,
            'caisse_decaissement' => 'EU',
            'devise' => 'USD',
            'observation' => 'Motif rejet Finance: code budgétaire incorrect',
            'montant_total' => 100,
            'status' => 'draft',
        ]);
        $demande = Demande::create([
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

        $this->actingAs($manager)
            ->patch(route('requisitions.manager-decision', $requisition), [
                'decision' => 'approve',
                'caisse_decaissement' => 'EU',
            ])
            ->assertForbidden();

        $this->actingAs($manager)
            ->patch(route('requisitions.update', $requisition), [
                'caisse_decaissement' => 'EU',
                'devise' => 'USD',
                'observation' => 'Motif rejet Finance: code budgétaire incorrect',
                'articles' => [[
                    'id' => $demande->id,
                    'activite' => 'Papier corrigé',
                    'code_all_budget' => 'BUD-003',
                    'nature' => 'Achat',
                    'quantiteOuDuree' => 2,
                    'unite' => 'Carton',
                    'prixUnitaire' => 55,
                ]],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('demandes', [
            'id' => $demande->id,
            'activite' => 'Papier corrigé',
            'code_all_budget' => 'BUD-003',
            'total_ligne' => 110,
        ]);
        $this->assertDatabaseHas('requisitions', [
            'id' => $requisition->id,
            'status' => 'draft',
            'montant_total' => 110,
        ]);

        $this->actingAs($manager)
            ->patch(route('requisitions.manager-decision', $requisition), [
                'decision' => 'approve',
                'caisse_decaissement' => 'EU',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('requisitions', [
            'id' => $requisition->id,
            'status' => 'visa_mp',
        ]);
    });

    it('counts Finance-returned drafts in the project manager correction queue', function () {
        $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
        $manager = User::factory()->create(['status' => 'active', 'project_id' => $project->id]);
        $manager->assignRole('project_manager');
        $staff = User::factory()->create();

        foreach ([
            ['numero' => 'RETURNED-BY-FINANCE', 'status' => 'draft', 'observation' => 'Motif rejet Finance: pièce manquante'],
            ['numero' => 'REJECTED-BY-MP', 'status' => 'rejetee', 'observation' => 'Motif rejet MP: non pertinent'],
            ['numero' => 'NORMAL-DRAFT', 'status' => 'draft', 'observation' => 'Nouvelle demande'],
        ] as $row) {
            Requisition::create([
                'user_id' => $staff->id,
                'project_id' => $project->id,
                'numero_requisition' => $row['numero'],
                'nature_requisition' => 'Achat',
                'projet' => $project->name,
                'devise' => 'USD',
                'montant_total' => 100,
                'status' => $row['status'],
                'observation' => $row['observation'],
            ]);
        }

        $this->actingAs($manager)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('requisitions', function ($rows) {
                    $byNumber = collect($rows)->keyBy('numero');

                    return $byNumber->get('RETURNED-BY-FINANCE')['needsCorrection'] === true
                        && $byNumber->get('RETURNED-BY-FINANCE')['canDecide'] === false
                        && $byNumber->get('REJECTED-BY-MP')['needsCorrection'] === true
                        && $byNumber->get('NORMAL-DRAFT')['needsCorrection'] === false;
                })
            );
    });
