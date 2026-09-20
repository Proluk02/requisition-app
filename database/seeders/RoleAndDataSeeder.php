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
        /*
        |--------------------------------------------------------------------------
        | 1. Création des rôles
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | 2. Création des projets
        |--------------------------------------------------------------------------
        */

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
                'full_name' => 'Habita et Maraichage',
            ],
            [
                'name' => 'MAHUWA',
                'full_name' => 'Maison des femmes',
            ],
            [
                'name' => 'USUMADA',
                'full_name' => 'Usimamizi wa Maendeleo',
            ],
        ];

        foreach ($projects as $project) {
            Project::firstOrCreate(
                ['name' => $project['name']],
                $project
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Création des sites
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | 4. Liaison du projet CHAKUISHI avec ses sites
        |--------------------------------------------------------------------------
        */

        $chakuishi = Project::where('name', 'CHAKUISHI')->first();

        $kanina = Site::where('name', 'Kanina')->first();
        $tshala = Site::where('name', 'Tshala')->first();

        if ($chakuishi && $kanina && $tshala) {
            $chakuishi->sites()->syncWithoutDetaching([
                $kanina->id,
                $tshala->id,
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | 5. Création du compte Administrateur
        |--------------------------------------------------------------------------
        */

        $admin = User::updateOrCreate(
            [
                'email' => 'prolukeka@gmail.com',
            ],
            [
                'name' => 'Administrateur',
                'first_name' => 'Admin',
                'last_name' => 'System',
                'password' => Hash::make('Admin@123456'),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $admin->syncRoles(['admin']);

        /*
        |--------------------------------------------------------------------------
        | 6. Création du compte Staff / Beneficiary
        |--------------------------------------------------------------------------
        */

        $staff = User::updateOrCreate(
            [
                'email' => 'prolukdev@gmail.com',
            ],
            [
                'name' => 'Staff Beneficiary',
                'first_name' => 'Staff',
                'last_name' => 'Beneficiary',
                'password' => Hash::make('Staff@123456'),
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

