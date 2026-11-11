<?php

use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

it('lists only director-approved requisitions and provides their payment request PDF', function () {
    Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
    $director = User::factory()->create(['role' => 'director', 'status' => 'active']);
    $director->assignRole('director');
    $initiator = User::factory()->create(['status' => 'active', 'name' => 'Initiateur Test']);
    $project = Project::create(['name' => 'Projet Approuvé', 'full_name' => 'Projet de test']);

    $approved = Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'APPROVED-001',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'caisse_decaissement' => 'Caisse USD',
        'devise' => 'USD',
        'montant_total' => 125,
        'status' => 'payment_request',
    ]);
    Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'PENDING-001',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'devise' => 'USD',
        'montant_total' => 50,
        'status' => 'visa_admin',
    ]);

    $this->actingAs($director)
        ->get(route('director.payment-requests'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Director/ApprovedPaymentRequests')
            ->where('requisitions.total', 1)
            ->where('requisitions.data.0.numero', 'APPROVED-001')
            ->where('requisitions.data.0.initiateur', 'Initiateur Test')
        );

    $this->actingAs($director)
        ->get(route('requisitions.payment-request.pdf', $approved))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

it('denies the approved payment requests menu to users without director authority', function () {
    Role::firstOrCreate(['name' => 'finance', 'guard_name' => 'web']);
    $finance = User::factory()->create(['role' => 'finance', 'status' => 'active']);
    $finance->assignRole('finance');

    $this->actingAs($finance)
        ->get(route('director.payment-requests'))
        ->assertForbidden();
});
