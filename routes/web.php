<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RequisitionController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


// Page d'accueil publique
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => false, // Pas d'inscription publique selon la règle #7
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Internationalisation dynamique (Laravel Lang : FR / EN)
Route::post('/locale/{locale}', [LocaleController::class, 'switch'])->name('locale.switch');

// Authentification Google OAuth (Réservée aux comptes créés par l'Admin)
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
});

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

    // Transport, Déplacements & Décharges Terrain
    Route::get('/transport', function () {
        return Inertia::render('Staff/Transport/Index');
    })->name('transport.index');
});

require __DIR__.'/auth.php';