<?php

use App\Models\Demande;
use App\Models\DemandeJustificatif;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\RequisitionSignature;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

it('loads the staff dashboard without crashing when no justificatifs exist', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->syncRoles(['beneficiary']);

    $requisition = Requisition::create([
        'user_id' => $user->id,
        'numero_requisition' => 'REQ-001',
        'nature_requisition' => 'service',
        'projet' => 'USIMAMIZI BORA',
        'project_code' => 'PRJ-01',
        'caisse_decaissement' => 'Caisse principale',
        'devise' => 'USD',
        'observation' => 'Test staff dashboard',
        'montant_total' => 125,
        'status' => 'draft',
    ]);

    Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Transport',
        'code_all_budget' => 'BUD-001',
        'nature' => 'service',
        'quantite' => 1,
        'duree' => 0,
        'unite' => null,
        'frais_unitaire' => 125,
        'total_ligne' => 125,
    ]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk();
});

it('stores uploaded justificatifs for a staff requisition', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->syncRoles(['beneficiary']);

    $project = Project::create([
        'name' => 'USIMAMIZI BORA',
        'full_name' => 'Bonne Gouvernance',
    ]);

    Storage::fake('public');

    $file = UploadedFile::fake()->create('invoice.pdf', 120, 'application/pdf');

    $response = $this->actingAs($user)->post('/requisitions', [
        'numero_requisition' => 'REQ-002',
        'nature_requisition' => 'Achat',
        'projet' => 'USIMAMIZI BORA',
        'project_code' => 'UB',
        'caisse_decaissement' => 'Caisse principale',
        'devise' => 'USD',
        'observation' => 'Test upload',
        'montant_total' => 50,
        'lignes' => [[
            'activite' => 'Papier',
            'code_all_budget' => 'BUD-002',
            'nature' => 'Achat',
            'quantite' => 2,
            'duree' => 0,
            'unite' => 'Pce',
            'frais_unitaire' => 25,
            'total_ligne' => 50,
            'justificatifs' => [[
                'description' => 'Invoice',
                'date' => now()->toDateString(),
                'montant' => 50,
                'file' => $file,
            ]],
        ]],
    ]);

    $response->assertRedirect('/requisitions');
    expect(DemandeJustificatif::count())->toBe(1);
    $this->assertDatabaseHas('requisitions', [
        'numero_requisition' => 'REQ-002',
        'project_id' => $project->id,
        'status' => 'draft',
    ]);
});

it('shows uploaded justificatifs in the requisitions list', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->syncRoles(['beneficiary']);

    Storage::fake('public');

    $requisition = Requisition::create([
        'user_id' => $user->id,
        'numero_requisition' => 'REQ-003',
        'nature_requisition' => 'Service',
        'projet' => 'AFYA BORA',
        'project_code' => 'AB',
        'caisse_decaissement' => 'EU',
        'devise' => 'USD',
        'observation' => 'Justificatifs de service',
        'montant_total' => 80,
        'status' => 'draft',
    ]);

    $demande = Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Transport',
        'code_all_budget' => 'BUD-003',
        'nature' => 'Service',
        'quantite' => 0,
        'duree' => 2,
        'unite' => 'Jours',
        'frais_unitaire' => 40,
        'total_ligne' => 80,
    ]);

    $file = UploadedFile::fake()->create('devis.pdf', 80, 'application/pdf');
    $path = $file->store('requisition-attachments', 'public');

    DemandeJustificatif::create([
        'demande_id' => $demande->id,
        'description' => 'Devis',
        'date' => now()->toDateString(),
        'montant' => 80,
        'file_path' => $path,
        'original_name' => 'devis.pdf',
        'mime_type' => 'application/pdf',
    ]);

    $response = $this->actingAs($user)->get('/requisitions');

    $response->assertOk();
    $response->assertSee('devis.pdf');
});

it('allows the requisition owner to consult a stored attachment through a protected route', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->syncRoles(['beneficiary']);

    Storage::fake('public');

    $requisition = Requisition::create([
        'user_id' => $user->id,
        'numero_requisition' => 'REQ-004',
        'nature_requisition' => 'Achat',
        'projet' => 'AFYA BORA',
        'project_code' => 'AB',
        'caisse_decaissement' => 'EU',
        'devise' => 'USD',
        'observation' => 'Consultation pièce jointe',
        'montant_total' => 100,
        'status' => 'draft',
    ]);

    $demande = Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Matériel',
        'code_all_budget' => 'BUD-004',
        'nature' => 'Achat',
        'quantite' => 1,
        'duree' => 0,
        'unite' => 'Lot',
        'frais_unitaire' => 100,
        'total_ligne' => 100,
    ]);

    $file = UploadedFile::fake()->create('facture.pdf', 60, 'application/pdf');
    $path = $file->store('requisition-attachments', 'public');

    $justificatif = DemandeJustificatif::create([
        'demande_id' => $demande->id,
        'description' => 'Facture',
        'date' => now()->toDateString(),
        'montant' => 100,
        'file_path' => $path,
        'original_name' => 'facture.pdf',
        'mime_type' => 'application/pdf',
    ]);
    $response = $this->actingAs($user)->get(route('requisitions.justificatif.show', ['justificatif' => $justificatif->id]));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/pdf');
});

it('persists edits to a draft requisition and recalculates its totals', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->syncRoles(['beneficiary']);

    $requisition = Requisition::create([
        'user_id' => $user->id,
        'numero_requisition' => 'REQ-005',
        'nature_requisition' => 'Achat',
        'projet' => 'AFYA BORA',
        'project_code' => 'AB',
        'caisse_decaissement' => 'EU',
        'devise' => 'USD',
        'observation' => 'Ancienne observation',
        'montant_total' => 100,
        'status' => 'draft',
    ]);

    $demande = Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Matériel',
        'code_all_budget' => 'BUD-005',
        'nature' => 'Achat',
        'quantite' => 2,
        'duree' => 0,
        'unite' => 'Lot',
        'frais_unitaire' => 50,
        'total_ligne' => 100,
    ]);

    $response = $this->actingAs($user)->patch(route('requisitions.update', $requisition), [
        'caisse_decaissement' => 'Caisse principale',
        'devise' => 'EUR',
        'observation' => 'Observation mise à jour',
        'articles' => [[
            'id' => $demande->id,
            'activite' => 'Matériel révisé',
            'quantiteOuDuree' => 3,
            'prixUnitaire' => 40,
        ]],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'caisse_decaissement' => 'Caisse principale',
        'devise' => 'EUR',
        'observation' => 'Observation mise à jour',
        'montant_total' => 120,
    ]);
    $this->assertDatabaseHas('demandes', [
        'id' => $demande->id,
        'activite' => 'Matériel révisé',
        'quantite' => 3,
        'frais_unitaire' => 40,
        'total_ligne' => 120,
    ]);
});

it('provides the director with requisition dates and attachment links', function () {
    Storage::fake('public');
    Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
    $director = User::factory()->create([
        'role' => 'director',
        'status' => 'active',
    ]);
    $director->assignRole('director');

    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $initiator = User::factory()->create(['status' => 'active']);
    $requisition = Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'DIR-ATTACHMENT-001',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'observation' => 'Achat documenté',
        'montant_total' => 100,
        'status' => 'visa_admin',
        'date_livraison' => '2026-10-20',
    ]);
    $demande = Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Matériel',
        'code_all_budget' => 'BUD-001',
        'nature' => 'Achat',
        'quantite' => 2,
        'duree' => 0,
        'unite' => 'Lot',
        'frais_unitaire' => 50,
        'total_ligne' => 100,
    ]);
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
    RequisitionSignature::create([
        'requisition_id' => $requisition->id,
        'user_id' => $initiator->id,
        'role_signataire' => 'finance',
        'nom_signataire' => 'Manager Finance',
        'action' => 'rejected',
        'commentaire' => 'Merci de joindre un devis valide.',
        'signature_hash' => hash('sha256', 'director-test'),
        'signed_at' => now(),
    ]);

    $this->actingAs($director)
        ->get(route('director.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Director/Dashboard')
            ->where('requisitions.0.observation', 'Achat documenté')
            ->where('requisitions.0.date_livraison', '20/10/2026')
            ->where('requisitions.0.signatures.0.commentaire', 'Merci de joindre un devis valide.')
            ->where('requisitions.0.lignes.0.justificatifs.0.nom', 'devis.pdf')
            ->where('requisitions.0.lignes.0.justificatifs.0.description', 'Devis fournisseur')
            ->where('requisitions.0.lignes.0.justificatifs.0.fileUrl', route('requisitions.justificatif.show', $justificatif))
        );

    $this->actingAs($director)
        ->get(route('requisitions.justificatif.show', $justificatif))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

it('shows accurate requisition status and accessible attachments to the project manager', function () {
    Storage::fake('public');
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $manager = User::factory()->create([
        'role' => 'project_manager',
        'project_id' => $project->id,
        'status' => 'active',
    ]);
    $manager->assignRole('project_manager');
    $initiator = User::factory()->create(['status' => 'active']);
    $initiator->assignRole('beneficiary');
    $requisition = Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'PM-STATUS-001',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'montant_total' => 80,
        'status' => 'decaisse',
    ]);
    $demande = Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Papeterie',
        'code_all_budget' => 'BUD-001',
        'nature' => 'Achat',
        'quantite' => 2,
        'duree' => 0,
        'unite' => 'Lot',
        'frais_unitaire' => 40,
        'total_ligne' => 80,
    ]);
    $attachment = UploadedFile::fake()->create('devis.pdf', 20, 'application/pdf');
    $path = $attachment->store('requisition-attachments', 'public');
    $justificatif = DemandeJustificatif::create([
        'demande_id' => $demande->id,
        'description' => 'Devis fournisseur',
        'date' => now()->toDateString(),
        'montant' => 80,
        'file_path' => $path,
        'original_name' => 'devis.pdf',
        'mime_type' => 'application/pdf',
    ]);

    $this->actingAs($manager)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ProjectManager/Dashboard')
            ->where('requisitions.0.statusCode', 'decaisse')
            ->where('requisitions.0.statusLabel', 'Décaissée')
            ->where('requisitions.0.lignes.0.justif.0.fileUrl', route('requisitions.justificatif.show', $justificatif))
        );

    $this->actingAs($manager)
        ->get(route('requisitions.justificatif.show', $justificatif))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});
