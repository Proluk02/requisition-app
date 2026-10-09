<?php

use App\Models\BudgetLine;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\Permission\Models\Role;

function createBudgetImportFinanceUser(Project $project): User
{
    Role::firstOrCreate(['name' => 'finance', 'guard_name' => 'web']);

    $finance = User::factory()->create([
        'status' => 'active',
        'project_id' => $project->id,
        'role' => 'finance',
    ]);
    $finance->assignRole('finance');

    return $finance;
}

it('shows the budget line import form to finance users', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $otherProject = Project::create(['name' => 'AFYA BORA', 'full_name' => 'Santé de Qualité']);
    $finance = createBudgetImportFinanceUser($project);

    $this->actingAs($finance)
        ->get(route('finance.budgets.import-form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Finance/Budgets/Import')
            ->has('projects', 2)
            ->where('projects.0.id', $otherProject->id)
            ->where('projects.1.id', $project->id)
        );
});

it('imports excel allocation codes and budget data into the selected project', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $finance = createBudgetImportFinanceUser($project);

    $spreadsheet = new Spreadsheet();
    $spreadsheet->getActiveSheet()->fromArray([
        ['CATEGORY', 'SUBCATEGORY', 'DESCRIPT', 'SPLIT', 'CODE', 'LIBELLE', 'DEVISE', 'BUDGET_INITIAL', 'DONATEUR'],
        ['6', '112', 'a', '1', '6.112.a.1', 'Matériel de bureau', 'USD', 1250.5, 'Union Européenne'],
    ], null, 'A1');

    $tempPath = tempnam(sys_get_temp_dir(), 'budget-import-');
    (new Xlsx($spreadsheet))->save($tempPath);

    try {
        $file = UploadedFile::fake()->createWithContent('lignes-budget.xlsx', file_get_contents($tempPath));

        $this->actingAs($finance)
            ->post(route('finance.budgets.import'), [
                'project_id' => $project->id,
                'file' => $file,
            ])
            ->assertRedirect();
    } finally {
        unlink($tempPath);
    }

    $line = BudgetLine::where('project_id', $project->id)->where('code', '6.112.a.1')->first();

    expect($line)->not->toBeNull()
        ->and($line->category_code)->toBe('6')
        ->and($line->subcategory_code)->toBe('112')
        ->and($line->descript_code)->toBe('a')
        ->and($line->split_code)->toBe('1')
        ->and($line->libelle)->toBe('Matériel de bureau')
        ->and((float) $line->budget_initial)->toBe(1250.5);

    $this->assertDatabaseHas('donors', ['id' => $line->donor_id, 'name' => 'Union Européenne']);
});

it('rejects imports that omit a required budget column', function () {
    $project = Project::create(['name' => 'USIMAMIZI BORA', 'full_name' => 'Bonne Gouvernance']);
    $finance = createBudgetImportFinanceUser($project);
    $file = UploadedFile::fake()->createWithContent(
        'lignes-budget.csv',
        "CATEGORY,SUBCATEGORY,DESCRIPT,SPLIT,CODE,LIBELLE,DEVISE,BUDGET_INITIAL\n6,112,a,1,6.112.a.1,Matériel,USD,100"
    );

    $this->actingAs($finance)
        ->from(route('finance.budgets.import-form'))
        ->post(route('finance.budgets.import'), [
            'project_id' => $project->id,
            'file' => $file,
        ])
        ->assertRedirect(route('finance.budgets.import-form'))
        ->assertSessionHas('error', fn (string $message) => str_contains($message, 'DONATEUR'));

    expect(BudgetLine::count())->toBe(0);
});
