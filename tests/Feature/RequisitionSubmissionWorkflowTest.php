<?php

use App\Models\CashRegister;
use App\Models\Project;
use App\Models\Requisition;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Role;

it('routes submissions outside the 20th-25th window through finance first', function () {
    Role::firstOrCreate(['name' => 'beneficiary', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'finance', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);

    $user = User::factory()->create([
        'role' => 'beneficiary',
        'status' => 'active',
    ]);
    $user->assignRole('beneficiary');

    $project = Project::create([
        'name' => 'Projet Test',
        'full_name' => 'Projet Test',
    ]);

    CashRegister::create([
        'name' => 'Caisse principale',
        'code' => 'CP',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_active' => true,
    ]);

    foreach ([
        ['2026-11-12', 'finance_precheck'],
        ['2026-11-22', 'draft'],
        ['2026-11-28', 'finance_precheck'],
    ] as [$submissionDate, $expectedStatus]) {
        $this->travelTo(Carbon::parse($submissionDate.' 12:00:00'));

        $this->actingAs($user)
            ->post(route('requisitions.store'), [
                'nature_requisition' => 'Achat',
                'projet' => $project->name,
                'caisse_decaissement' => 'Caisse principale',
                'devise' => 'USD',
                'mode_paiement' => 'Virement bancaire',
                'beneficiaire_nom' => 'Fournisseur Test',
                'beneficiaire_adresse' => 'Adresse complète',
                'beneficiaire_telephone' => '+243000000000',
                'beneficiaire_email' => 'fournisseur@example.test',
                'numero_facture' => 'FAC-TEST',
                'date_facture' => '2026-11-10',
                'date_paiement' => '2026-12-01',
                'montant_total' => 100,
                'lignes' => [[
                    'activite' => 'Fournitures',
                    'entreprise' => 'BON PASTEUR',
                    'donneur' => 'Fonds propres',
                    'code_all_budget' => 'BUD-001',
                    'nature' => 'Achat',
                    'quantite' => 1,
                    'duree' => 0,
                    'unite' => 'Lot',
                    'frais_unitaire' => 100,
                    'total_ligne' => 100,
                ]],
            ])
            ->assertRedirect(route('dashboard'));

        $requisition = Requisition::latest('created_at')->firstOrFail();
        expect($requisition->status)->toBe($expectedStatus);
        $this->assertDatabaseHas('demandes', [
            'requisition_id' => $requisition->id,
            'entreprise' => 'BON PASTEUR',
            'donneur' => 'Fonds propres',
            'code_all_budget' => 'BUD-001',
        ]);
    }
});

it('does not expose the retired cashier and disbursement routes', function () {
    expect(Route::has('petty-cash.index'))->toBeFalse()
        ->and(Route::has('transport.index'))->toBeFalse()
        ->and(Route::has('justifications.index'))->toBeFalse()
        ->and(Route::has('justifications.apurer'))->toBeFalse();
});
