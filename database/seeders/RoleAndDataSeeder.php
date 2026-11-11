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

        $beneficiary = User::updateOrCreate(
            [
                'email' => 'falonnemwenda603@gmail.com',
            ],
            [
                'name' => 'Falonne Mwenda',
                'first_name' => 'Falonne',
                'last_name' => 'Mwenda',
                'password' => Hash::make('password123'),
                'role' => 'beneficiary',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $beneficiary->syncRoles(['beneficiary']);

        $admin = User::updateOrCreate(
            [
                'email' => 'admin@gmail.com',
            ],
            [
                'name' => 'Miss Eunice',
                'first_name' => 'Eunice',
                'last_name' => 'Kenyan',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $admin->syncRoles(['admin']);

        $project = User::updateOrCreate(
            [
                'email' => 'project@gmail.com',
            ],
            [
                'name' => 'Myriam Mwenze',
                'first_name' => 'Myriam',
                'last_name' => 'Mwenze',
                'password' => Hash::make('password123'),
                'role' => 'project_manager',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $project->syncRoles(['project_manager']);

        $finance = User::updateOrCreate(
            [
                'email' => 'finance@gmail.com',
            ],
            [
                'name' => 'Anicet Mukanjila',
                'first_name' => 'Anicet',
                'last_name' => 'Mukanjila',
                'password' => Hash::make('password123'),
                'role' => 'finance',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $finance->syncRoles(['finance']);

        $pam = User::updateOrCreate(
            [
                'email' => 'pam@gmail.com',
            ],
            [
                'name' => 'Benjamin Mukanjila',   
                'first_name' => 'Benjamin',
                'last_name' => 'Mukanjila',
                'password' => Hash::make('password123'),
                'role' => 'admin_manager',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $pam->syncRoles(['admin_manager']);

        $director = User::updateOrCreate(
            [
                'email' => 'director@gmail.com',
            ],
            [
                'name' => 'Bernie The none',
                'first_name' => 'Bernie',
                'last_name' => 'The none',
                'password' => Hash::make('password123'),
                'role' => 'director',
                'status' => 'active',
                'email_verified_at' => now(),
                'project_id' => $chakuishi?->id,
                'site_id' => $kanina?->id,
            ]
        );

        $director->syncRoles(['director']);

    }
}
