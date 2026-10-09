<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\CashRegisterController;
use App\Http\Controllers\Admin\ProjectController;
use App\Http\Controllers\Admin\SiteController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\CashierController;
use App\Http\Controllers\CashierSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseJustificationController;
use App\Http\Controllers\Finance\BudgetController;
use App\Http\Controllers\Finance\CaisseManagementController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\PettyCashController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectManager\ReportingController;
use App\Http\Controllers\RequisitionController;
use App\Models\CashRegister;
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
    Route::get('/director/projects', [DashboardController::class, 'directorProjects'])->name('director.projects');
    Route::get('/director/caisses', [DashboardController::class, 'directorCaisses'])->name('director.caisses');
    Route::get('/director/urgences', [DashboardController::class, 'directorUrgences'])->name('director.urgences');

    Route::get('/pm/reporting', [ReportingController::class, 'index'])->name('pm.reporting.index');

    Route::prefix('finance')->name('finance.')->middleware('role:finance')->group(function () {
        Route::get('/requisitions', [DashboardController::class, 'finance'])->name('dashboard');

        Route::get('/budgets', [BudgetController::class, 'index'])->name('budgets.index');
        Route::get('/budgets/import', [BudgetController::class, 'importForm'])->name('budgets.import-form');
        Route::post('/budgets/import', [BudgetController::class, 'import'])->name('budgets.import');
        Route::post('/budgets/lines', [BudgetController::class, 'storeBudgetLine'])->name('budgets.lines.store');
        Route::post('/donors', [BudgetController::class, 'storeDonor'])->name('donors.store');

        Route::get('/caisses', [CaisseManagementController::class, 'index'])->name('caisses.index');
        Route::post('/caisses', [CaisseManagementController::class, 'store'])->name('caisses.store');
        Route::put('/caisses/{cashRegister}', [CaisseManagementController::class, 'update'])->name('caisses.update');
        Route::get('/caisses/sessions', [CaisseManagementController::class, 'sessions'])->name('caisses.sessions');
    });

    Route::prefix('cashier')->name('cashier.')->group(function () {
        Route::get('/dashboard', [CashierController::class, 'index'])->name('dashboard');
        Route::get('/disbursements', [CashierController::class, 'disbursements'])->name('disbursements.index');
        Route::get('/receipts', [CashierController::class, 'receipts'])->name('receipts.index');
        Route::get('/ledger', [CashierController::class, 'ledger'])->name('ledger.index');
        Route::get('/ledger/export', [CashierController::class, 'exportLedger'])->name('ledger.export');
    });

    Route::patch('/requisitions/{requisition}/cashier-disburse', [CashierController::class, 'disburse'])->name('requisitions.cashier-disburse');

    Route::post('/cashier/registers/{cashRegister}/request-opening', [CashierSessionController::class, 'requestOpening'])->name('cashier.session.request-opening');
    Route::patch('/cashier/sessions/{session}/authorize-opening', [CashierSessionController::class, 'authorizeOpening'])->name('cashier.session.authorize-opening');
    Route::post('/cashier/sessions/{session}/close', [CashierSessionController::class, 'closeSession'])->name('cashier.session.close');
    Route::post('/cashier/registers/{cashRegister}/entree', [CashierSessionController::class, 'storeEntree'])->name('cashier.movement.entree');

    Route::get('/justifications', [ExpenseJustificationController::class, 'index'])->name('justifications.index');
    Route::post('/justifications', [ExpenseJustificationController::class, 'store'])->name('justifications.store');
    Route::patch('/justifications/{justification}/visa-mp', [ExpenseJustificationController::class, 'visaMP'])->name('justifications.visa-mp');
    Route::patch('/justifications/{justification}/apurer', [ExpenseJustificationController::class, 'apurerCaissier'])->name('justifications.apurer');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/pin', [ProfileController::class, 'updatePin'])->name('profile.pin.update');
    Route::get('/requisitions', [RequisitionController::class, 'index'])->name('requisitions.index');
    Route::get('/requisitions/create', function () {
        $caisses = CashRegister::where('is_active', true)->orderBy('name')->get(['id', 'name', 'devise']);
        $projectsList = Project::orderBy('name')->get(['id', 'name', 'full_name']);
        return Inertia::render('Staff/Requisitions/Create', [
            'caisses' => $caisses,
            'projectsList' => $projectsList,
        ]);
    })->name('requisitions.create');
    Route::post('/requisitions', [RequisitionController::class, 'store'])->name('requisitions.store');
    Route::get('/requisitions/justificatifs/{justificatif}', [RequisitionController::class, 'showJustificatif'])->name('requisitions.justificatif.show');
    Route::patch('/requisitions/{requisition}', [RequisitionController::class, 'update'])->name('requisitions.update');
    Route::patch('/requisitions/{requisition}/urgent-director', [RequisitionController::class, 'urgentDirectorApproval'])->name('requisitions.urgent-director');
    Route::patch('/requisitions/{requisition}/manager-decision', [RequisitionController::class, 'managerDecision'])->name('requisitions.manager-decision');
    Route::patch('/requisitions/{requisition}/finance-decision', [RequisitionController::class, 'financeDecision'])->name('requisitions.finance-decision');
    Route::patch('/requisitions/{requisition}/admin-decision', [RequisitionController::class, 'adminDecision'])->name('requisitions.admin-decision');
    Route::patch('/requisitions/{requisition}/director-decision', [RequisitionController::class, 'directorDecision'])->name('requisitions.director-decision');

    Route::get('/petty-cash', [PettyCashController::class, 'index'])->name('petty-cash.index');
    Route::post('/petty-cash', [PettyCashController::class, 'store'])->name('petty-cash.store');
    Route::patch('/petty-cash/{voucher}/visa-mp', [PettyCashController::class, 'visaMP'])->name('petty-cash.visa-mp');
    Route::patch('/petty-cash/{voucher}/authorize', [PettyCashController::class, 'authorizeVoucher'])->name('petty-cash.authorize');

    Route::get('/transport', [PettyCashController::class, 'index'])->name('transport.index');

    Route::post('/notifications/{id}/mark-read', function (Request $request, $id) {
        DB::table('notifications')
            ->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $request->user()->id)
            ->where('id', $id)
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return back();
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

        return back();
    })->name('notifications.mark-all-read');
});

require __DIR__.'/auth.php';