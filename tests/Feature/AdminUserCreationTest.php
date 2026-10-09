<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

it('creates users with their first name, last name, display name, and default signature pin', function () {
    Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'web']);

    $admin = User::factory()->create(['status' => 'active']);
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'first_name' => 'Jean',
            'last_name' => 'Ilunga',
            'name' => 'Jean-Paul Ilunga',
            'email' => 'jean.ilunga@example.com',
            'password' => 'initial-password',
            'pin' => '1234',
            'role' => 'project_manager',
            'status' => 'active',
        ])
        ->assertRedirect(route('admin.users.index'));

    $user = User::where('email', 'jean.ilunga@example.com')->firstOrFail();

    expect($user->first_name)->toBe('Jean')
        ->and($user->last_name)->toBe('Ilunga')
        ->and($user->name)->toBe('Jean-Paul Ilunga')
        ->and(Hash::check('1234', $user->signature_pin))->toBeTrue()
        ->and($user->pin_set_at)->not->toBeNull();
});
