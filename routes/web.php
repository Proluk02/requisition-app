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

/*
|--------------------------------------------------------------------------
| Web Routes - Plateforme de Gestion des Réquisitions (ASBL Bon Pasteur)
|--------------------------------------------------------------------------
*/

// Page d'accueil publique
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => false,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Internationalisation dynamique (Laravel Lang : FR / EN)
Route::post('/locale/{locale}', [LocaleController::class, 'switch'])->name('locale.switch');

// Authentification Google OAuth (Réservée aux comptes créés par l'Admin)
Route::get('auth/google', [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('auth/google/callback', [GoogleController::class, 'handleGoogleCallback'])->name('google.callback');

// Dérogation urgente préalable par la Directrice Générale
Route::patch('/requisitions/{requisition}/urgent-director', [RequisitionController::class, 'urgentDirectorApproval'])
    ->name('requisitions.urgent-director');

// --------------------------------------------------------------------------
// GROUPE ADMINISTRATEUR SYSTÈME
// --------------------------------------------------------------------------
Route::middleware(['auth', 'active', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::get('/users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
});

// --------------------------------------------------------------------------
// GROUPE UTILISATEURS AUTHENTIFIÉS ET ACTIFS
// --------------------------------------------------------------------------
Route::middleware(['auth', 'active'])->group(function () {
    // Redirection dynamique vers le bon Dashboard selon le Rôle Spatie
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    Route::get('/finance/requisitions', [DashboardController::class, 'finance'])
        ->middleware('role:finance')
        ->name('finance.dashboard');

    // Profil Utilisateur
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Réquisitions Opérationnelles (Staff & Manager de Projet)
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

    // Module Petits Cash / Petty Cash Vouchers (Photo 3)
    Route::get('/petty-cash', [PettyCashController::class, 'index'])->name('petty-cash.index');
    Route::post('/petty-cash', [PettyCashController::class, 'store'])->name('petty-cash.store');
    Route::patch('/petty-cash/{voucher}/visa-mp', [PettyCashController::class, 'visaMP'])->name('petty-cash.visa-mp');
    Route::patch('/petty-cash/{voucher}/authorize', [PettyCashController::class, 'authorizeVoucher'])->name('petty-cash.authorize');

    // Module Transport
    Route::get('/transport', [PettyCashController::class, 'index'])->name('transport.index');

    // 1. Marquer une seule notification comme lue (la fait disparaître immédiatement)
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

    // 2. Marquer toutes les notifications comme lues (vide entièrement la boîte)
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