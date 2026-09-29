<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\PettyCashController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RequisitionController;
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

Route::patch('/requisitions/{requisition}/urgent-director', [RequisitionController::class, 'urgentDirectorApproval'])
    ->name('requisitions.urgent-director');

Route::middleware(['auth', 'active', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    Route::get('/finance/requisitions', [DashboardController::class, 'finance'])
        ->middleware('role:finance')
        ->name('finance.dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/requisitions', [RequisitionController::class, 'index'])->name('requisitions.index');

    Route::get('/requisitions/justificatifs/{justificatif}', [RequisitionController::class, 'showJustificatif'])
        ->name('requisitions.justificatif.show');

    Route::get('/requisitions/create', function () {
        return Inertia::render('Staff/Requisitions/Create');
    })->name('requisitions.create');

    Route::post('/requisitions', [RequisitionController::class, 'store'])->name('requisitions.store');
    Route::patch('/requisitions/{requisition}', [RequisitionController::class, 'update'])->name('requisitions.update');
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