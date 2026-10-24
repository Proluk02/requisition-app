<?php

namespace App\Http\Controllers;

use App\Models\DailyExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class DailyExchangeRateController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Action réservée au service Finance.');

        $validated = $request->validate([
            'date_taux' => ['required', 'date'],
            'taux_eur_usd' => ['required', 'numeric', 'min:0.000001'],
            'taux_eur_cdf' => ['required', 'numeric', 'min:0.0001'],
        ], [
            'taux_eur_usd.required' => 'Le taux EUR/USD est obligatoire.',
            'taux_eur_cdf.required' => 'Le taux EUR/CDF est obligatoire.',
        ]);

        DailyExchangeRate::updateOrCreate(
            ['date_taux' => $validated['date_taux']],
            [
                'taux_eur_usd' => $validated['taux_eur_usd'],
                'taux_eur_cdf' => $validated['taux_eur_cdf'],
                'updated_by' => $user->id,
            ]
        );

        return Redirect::back()->with('success', "Taux de change journalier du {$validated['date_taux']} enregistré avec succès.");
    }
}
