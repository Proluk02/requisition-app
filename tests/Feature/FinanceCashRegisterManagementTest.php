<?php

use App\Models\CashRegister;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;

it('allows finance to search and manage cash registers', function () {
    Role::firstOrCreate(['name' => 'finance', 'guard_name' => 'web']);
    $finance = User::factory()->create(['role' => 'finance', 'status' => 'active']);
    $finance->assignRole('finance');

    $matched = CashRegister::create([
        'name' => 'Caisse USD',
        'code' => 'USD-01',
        'devise' => 'USD',
        'solde_actuel' => 0,
        'is_active' => true,
    ]);
    CashRegister::create([
        'name' => 'Caisse Franc',
        'code' => 'CDF-01',
        'devise' => 'FC',
        'solde_actuel' => 0,
        'is_active' => true,
    ]);

    $this->actingAs($finance)
        ->get(route('finance.cash-registers.index', ['search' => 'USD']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Admin/CashRegisters/Index')
            ->where('search', 'USD')
            ->has('cashRegisters', 1)
            ->where('cashRegisters.0.id', $matched->id)
        );

    $this->post(route('finance.cash-registers.store'), [
        'name' => 'Caisse Test',
        'code' => 'TEST-01',
        'devise' => 'USD',
        'solde_initial' => 25,
    ])->assertRedirect();
    $created = CashRegister::where('code', 'TEST-01')->firstOrFail();

    $this->put(route('finance.cash-registers.update', $created), [
        'name' => 'Caisse Test modifiée',
        'code' => 'TEST-02',
        'devise' => 'FC',
        'is_active' => false,
    ])->assertRedirect();

    $this->delete(route('finance.cash-registers.destroy', $created))
        ->assertRedirect();

    $this->assertDatabaseMissing('cash_registers', ['id' => $created->id]);
    $this->assertDatabaseHas('cash_registers', ['id' => $matched->id]);
});
