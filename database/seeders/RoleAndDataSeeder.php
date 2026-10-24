<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class RoleAndDataSeeder extends Seeder
{
    public function run(): void
    {

        $roles = [
            'admin',
            'beneficiary',
            'project_manager',
            'finance',
            'admin_manager',
            'director',
            'purchaser',
            'cashier',
            'coordinator',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'web',
            ]);
        }

        $projects = [
            [
                'name' => 'USIMAMIZI BORA',
                'full_name' => 'Bonne Gouvernance',
            ],
            [
                'name' => 'AFYA BORA',
                'full_name' => 'Santé de Qualité',
            ],
            [
                'name' => 'CHAKUISHI',
                'full_name' => 'Chakula Kwa ku ishi',
            ],
            [
                'name' => 'HABIMA',
                'full_name' => '',
            ],
            [
                'name' => 'MAHUWA',
                'full_name' => '',
            ],
            [
                'name' => 'USUMADA',
                'full_name' => '',
            ],
        ];

        foreach ($projects as $project) {
            Project::firstOrCreate(
                ['name' => $project['name']],
                $project
            );
        }

        $sites = [
            'Kanina',
            'Tshala',
            'Kabamba',
            'Mukoma',
            'Kapata',
            'Musonoie',
        ];

        foreach ($sites as $site) {
            Site::firstOrCreate([
                'name' => $site,
            ]);
        }

        $chakuishi = Project::where('name', 'CHAKUISHI')->first();

        $kanina = Site::where('name', 'Kanina')->first();
        $tshala = Site::where('name', 'Tshala')->first();

        if ($chakuishi && $kanina && $tshala) {
            $chakuishi->sites()->syncWithoutDetaching([
                $kanina->id,
                $tshala->id,
            ]);
        }

        $admin = User::updateOrCreate(
            [
                'email' => 'prolukeka@gmail.com',
            ],
            [
                'name' => 'Administrateur',
                'first_name' => 'Semper',
                'last_name' => 'Othan',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $admin->syncRoles(['admin']);

        $staff = User::updateOrCreate(
            [
                'email' => 'prolukdev@gmail.com',
            ],
            [
                'name' => 'Miss Eunice',
                'first_name' => 'Eunice',
                'last_name' => 'Kenyan',
                'password' => Hash::make('password123'),
                'role' => 'beneficiary',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $staff->syncRoles(['beneficiary']);
    }
}
