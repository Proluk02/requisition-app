<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\CashRegisterController;
use App\Http\Controllers\Admin\ProjectController;
use App\Http\Controllers\Admin\SiteController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\DailyExchangeRateController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Finance\BudgetController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectManager\ReportingController;
use App\Http\Controllers\RequisitionController;
use App\Http\Controllers\SignatureVerificationController;
use App\Models\CashRegister;
use App\Models\Donor;
use App\Models\Project;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => false,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::post('/locale/{locale}', [LocaleController::class, 'switch'])->name('locale.switch');

Route::get('auth/google', [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('auth/google/callback', [GoogleController::class, 'handleGoogleCallback'])->name('google.callback');

Route::middleware(['auth', 'active', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    Route::get('/sites', [SiteController::class, 'index'])->name('sites.index');
    Route::post('/sites', [SiteController::class, 'store'])->name('sites.store');
    Route::put('/sites/{site}', [SiteController::class, 'update'])->name('sites.update');
    Route::delete('/sites/{site}', [SiteController::class, 'destroy'])->name('sites.destroy');

    Route::get('/cash-registers', [CashRegisterController::class, 'index'])->name('cash-registers.index');
    Route::post('/cash-registers', [CashRegisterController::class, 'store'])->name('cash-registers.store');
    Route::put('/cash-registers/{cashRegister}', [CashRegisterController::class, 'update'])->name('cash-registers.update');
    Route::delete('/cash-registers/{cashRegister}', [CashRegisterController::class, 'destroy'])->name('cash-registers.destroy');

    Route::get('/backup/download', [BackupController::class, 'download'])->name('backup.download');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/director/dashboard', [DashboardController::class, 'directorDashboard'])->name('director.dashboard');
    Route::get('/director/payment-requests', [DashboardController::class, 'directorPaymentRequests'])->name('director.payment-requests');
    Route::get('/director/projects', [DashboardController::class, 'directorProjects'])->name('director.projects');
    Route::get('/director/caisses', [DashboardController::class, 'directorCaisses'])->name('director.caisses');
    Route::get('/director/urgences', [DashboardController::class, 'directorUrgences'])->name('director.urgences');

    Route::get('/pm/reporting', [ReportingController::class, 'index'])->name('pm.reporting.index');

    Route::prefix('finance')->name('finance.')->middleware('role:finance')->group(function () {
        Route::get('/requisitions', [DashboardController::class, 'finance'])->name('dashboard');
        Route::get('/cash-registers', [CashRegisterController::class, 'index'])->name('cash-registers.index');
        Route::post('/cash-registers', [CashRegisterController::class, 'store'])->name('cash-registers.store');
        Route::put('/cash-registers/{cashRegister}', [CashRegisterController::class, 'update'])->name('cash-registers.update');
        Route::delete('/cash-registers/{cashRegister}', [CashRegisterController::class, 'destroy'])->name('cash-registers.destroy');

        Route::get('/exchange-rates', [DailyExchangeRateController::class, 'index'])
            ->name('exchange-rates.index');
        Route::post('/exchange-rates', [DailyExchangeRateController::class, 'store'])
            ->name('exchange-rates.store');
        Route::put('/exchange-rates/{exchangeRate}', [DailyExchangeRateController::class, 'update'])
            ->name('exchange-rates.update');
        Route::delete('/exchange-rates/{exchangeRate}', [DailyExchangeRateController::class, 'destroy'])
            ->name('exchange-rates.destroy');

        Route::get('/budgets', [BudgetController::class, 'index'])->name('budgets.index');
        Route::get('/budgets/import', [BudgetController::class, 'importForm'])->name('budgets.import-form');
        Route::post('/budgets/import', [BudgetController::class, 'import'])->name('budgets.import');

        Route::post('/budgets/lines', [BudgetController::class, 'storeBudgetLine'])->name('budgets.lines.store');
        Route::put('/budgets/lines/{budgetLine}', [BudgetController::class, 'updateBudgetLine'])->name('budgets.lines.update');
        Route::delete('/budgets/lines/{budgetLine}', [BudgetController::class, 'destroyBudgetLine'])->name('budgets.lines.destroy');

        Route::post('/donors', [BudgetController::class, 'storeDonor'])->name('donors.store');
        Route::put('/donors/{donor}', [BudgetController::class, 'updateDonor'])->name('donors.update');
        Route::delete('/donors/{donor}', [BudgetController::class, 'destroyDonor'])->name('donors.destroy');

    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/pin', [ProfileController::class, 'updatePin'])->name('profile.pin.update');

    Route::get('/requisitions', [RequisitionController::class, 'index'])->name('requisitions.index');
    Route::get('/requisitions/create', function (Request $request) {
        $caisses = CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']);
        $user = $request->user();

        // LOGIQUE DE FILTRAGE STRICTE SELON LE RÔLE
        if ($user->hasRole('coordinator') && $user->site_id) {
            // Le coordinateur ne voit QUE les projets autorisés sur son site
            $projectsList = $user->site->projects()->orderBy('name')->get(['projects.id', 'name', 'full_name']);
        } elseif ($user->hasRole('project_manager') && $user->project_id) {
            // Le MP ne voit QUE son propre projet
            $projectsList = Project::where('id', $user->project_id)->get(['id', 'name', 'full_name']);
        } else {
            // Un Staff normal ou Administrateur peut voir tous les projets
            $projectsList = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        }

        return Inertia::render('Staff/Requisitions/Create', [
            'caisses' => $caisses,
            'projectsList' => $projectsList,
            'donors' => Donor::orderBy('name')->get(['id', 'name', 'code']),
        ]);
    })->name('requisitions.create');

    Route::post('/requisitions', [RequisitionController::class, 'store'])->name('requisitions.store');
    Route::get('/requisitions/justificatifs/{justificatif}', [RequisitionController::class, 'showJustificatif'])->name('requisitions.justificatif.show');
    Route::patch('/requisitions/{requisition}', [RequisitionController::class, 'update'])->name('requisitions.update');
    Route::patch('/requisitions/{requisition}/manager-decision', [RequisitionController::class, 'managerDecision'])->name('requisitions.manager-decision');
    Route::patch('/requisitions/{requisition}/finance-decision', [RequisitionController::class, 'financeDecision'])->name('requisitions.finance-decision');
    Route::patch('/requisitions/{requisition}/admin-decision', [RequisitionController::class, 'adminDecision'])->name('requisitions.admin-decision');
    Route::patch('/requisitions/{requisition}/director-decision', [RequisitionController::class, 'directorDecision'])->name('requisitions.director-decision');

    Route::get('/requisitions/{requisition}/pdf', [RequisitionController::class, 'generatePdf'])->name('requisitions.pdf');
    Route::get('/requisitions/{requisition}/payment-request', [RequisitionController::class, 'generatePaymentRequestPdf'])->name('requisitions.payment-request.pdf');
    Route::get('/verify/signature/{hash}', [SignatureVerificationController::class, 'verify'])
        ->name('signature.verify');

    Route::post('/notifications/{id}/mark-read', function (Request $request, $id) {
        DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $request->user()->id)
            ->where('id', $id)
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['success' => true]);
    })->name('notifications.mark-read');

    Route::post('/notifications/mark-all-read', function (Request $request) {
        DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $request->user()->id)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['success' => true]);
    })->name('notifications.mark-all-read');
});

require __DIR__.'/auth.php';