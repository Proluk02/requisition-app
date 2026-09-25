<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
{
    $user = $request->user();

    if ($user->hasRole('admin')) {
        return Inertia::render('Admin/Dashboard');
    }

    // Le Manager de Projet
    if ($user->hasRole('project_manager')) {
        return Inertia::render('ProjectManager/Dashboard');
    }

    if ($user->hasRole('coordinator') || $user->hasRole('beneficiary')) {
        return Inertia::render('Staff/Dashboard');
    }

    return Inertia::render('Dashboard');
}
}
