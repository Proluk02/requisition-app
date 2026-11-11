<?php

use App\Models\Demande;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use App\Notifications\PaymentRequestReady;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

it('sends the generated payment request PDF to the initiator after director approval', function () {
    Notification::fake();
    Role::firstOrCreate(['name' => 'director', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);

    $director = User::factory()->create(['role' => 'director', 'status' => 'active']);
    $director->assignRole('director');
    $director->update(['signature_pin' => Hash::make('1234')]);

    $initiator = User::factory()->create(['role' => 'beneficiary', 'status' => 'active']);
    $initiator->assignRole('beneficiary');

    $project = Project::create(['name' => 'Projet Payment Request', 'full_name' => 'Projet de test']);
    $requisition = Requisition::create([
        'user_id' => $initiator->id,
        'project_id' => $project->id,
        'numero_requisition' => 'PR-2026-001',
        'nature_requisition' => 'Achat',
        'projet' => $project->name,
        'caisse_decaissement' => 'Caisse USD',
        'devise' => 'USD',
        'montant_total' => 120,
        'status' => 'visa_admin',
        'date_paiement' => now()->addMonth()->startOfMonth()->toDateString(),
    ]);
    Demande::create([
        'requisition_id' => $requisition->id,
        'activite' => 'Fournitures de bureau',
        'entreprise' => 'BON PASTEUR',
        'donneur' => 'Donateur test',
        'code_all_budget' => 'BUD-01',
        'nature' => 'Achat',
        'quantite' => 2,
        'duree' => 0,
        'unite' => 'lot',
        'frais_unitaire' => 60,
        'total_ligne' => 120,
    ]);

    $this->actingAs($director)
        ->patch(route('requisitions.director-decision', $requisition), [
            'decision' => 'approve',
            'pin' => '1234',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('requisitions', [
        'id' => $requisition->id,
        'status' => 'payment_request',
    ]);

    Notification::assertSentTo($initiator, PaymentRequestReady::class, function (PaymentRequestReady $notification) use ($initiator) {
        $mail = $notification->toMail($initiator);
        $attachment = $mail->rawAttachments[0] ?? null;

        return $mail->subject === 'Payment Request PR-2026-001'
            && ($attachment['name'] ?? null) === 'Payment_Request_PR-2026-001.pdf'
            && str_starts_with($attachment['data'] ?? '', '%PDF');
    });
});
