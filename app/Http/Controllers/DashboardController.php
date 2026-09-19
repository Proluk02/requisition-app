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

        if ($user->hasRole('coordinator') || $user->hasRole('beneficiary')) {
            return Inertia::render('Staff/Dashboard');
        }

        // Vue par défaut pour les autres rôles (ex: Finance, Director, etc.)
        return Inertia::render('Dashboard');
    }
}
