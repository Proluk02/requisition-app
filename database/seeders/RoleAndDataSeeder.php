<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Site;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleAndDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Création des Rôles
        $roles = [
            'admin', 'beneficiary', 'project_manager', 'finance',
            'admin_manager', 'director', 'purchaser', 'cashier', 'coordinator',
        ];
        foreach ($roles as $role) {
            Role::create(['name' => $role]);
        }

        // 2. Création des Projets
        $projects = [
            ['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance'],
            ['name' => 'AFYA BORA', 'full_name' => 'Santé de Qualité'],
            ['name' => 'CHAKUISHI', 'full_name' => 'Chakula Kwa ku ishi'],
            ['name' => 'HABIMA', 'full_name' => 'Habita et Maraichage'],
            ['name' => 'MAHUWA', 'full_name' => 'Maison des femmes'],
            ['name' => 'USUMADA', 'full_name' => 'Usimamizi wa Maendeleo'],
        ];
        foreach ($projects as $p) {
            Project::create($p);
        }

        // 3. Création des Sites
        $sites = ['Kanina', 'Tshala', 'Kabamba', 'mukoma', 'Kapata', 'Musonoie'];
        foreach ($sites as $s) {
            Site::create(['name' => $s]);
        }

        // 4. Exemple de liaison (Le projet CHAKUISHI oeuvre à Kanina et Tshala)
        $chakuishi = Project::where('name', 'CHAKUISHI')->first();
        $kanina = Site::where('name', 'Kanina')->first();
        $tshala = Site::where('name', 'Tshala')->first();

        $chakuishi->sites()->attach([$kanina->id, $tshala->id]);
    }
}
