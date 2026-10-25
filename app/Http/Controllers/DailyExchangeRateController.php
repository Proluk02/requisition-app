<?php

namespace App\Http\Controllers;

use App\Models\DailyExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class DailyExchangeRateController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Accès réservé au service Finance.');

        $activeRate = DailyExchangeRate::getActiveRate();

        $ratesHistory = DailyExchangeRate::with('user')
            ->orderByDesc('date_taux')
            ->paginate(25)
            ->through(fn ($rate) => [
                'id' => $rate->id,
                'date_taux' => $rate->date_taux->format('d/m/Y'),
                'date_raw' => $rate->date_taux->format('Y-m-d'),
                'taux_eur_usd' => (float) $rate->taux_eur_usd,
                'taux_eur_cdf' => (float) $rate->taux_eur_cdf,
                'updated_by_name' => $rate->user?->name ?? 'Système',
                'created_at' => $rate->created_at?->format('d/m/Y H:i') ?? '',
            ]);

        $chartData = DailyExchangeRate::orderBy('date_taux')
            ->take(15)
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date_taux->format('d/m'),
                'usd' => (float) $r->taux_eur_usd,
                'cdf' => (float) $r->taux_eur_cdf,
            ]);

        return Inertia::render('Finance/ExchangeRates/Index', [
            'activeRate' => $activeRate ? [
                'id' => $activeRate->id,
                'date_taux' => $activeRate->date_taux->format('d/m/Y'),
                'date_raw' => $activeRate->date_taux->format('Y-m-d'),
                'taux_eur_usd' => (float) $activeRate->taux_eur_usd,
                'taux_eur_cdf' => (float) $activeRate->taux_eur_cdf,
                'is_today' => $activeRate->date_taux->isToday(),
            ] : null,
            'ratesHistory' => $ratesHistory,
            'chartData' => $chartData,
        ]);
    }

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

    public function update(Request $request, DailyExchangeRate $exchangeRate)
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Action réservée au service Finance.');

        $validated = $request->validate([
            'date_taux' => ['required', 'date', 'unique:daily_exchange_rates,date_taux,' . $exchangeRate->id],
            'taux_eur_usd' => ['required', 'numeric', 'min:0.000001'],
            'taux_eur_cdf' => ['required', 'numeric', 'min:0.0001'],
        ], [
            'date_taux.unique' => 'Une autre saisie existe déjà pour cette date.',
            'taux_eur_usd.required' => 'Le taux EUR/USD est obligatoire.',
            'taux_eur_cdf.required' => 'Le taux EUR/CDF est obligatoire.',
        ]);

        $exchangeRate->update([
            'date_taux' => $validated['date_taux'],
            'taux_eur_usd' => $validated['taux_eur_usd'],
            'taux_eur_cdf' => $validated['taux_eur_cdf'],
            'updated_by' => $user->id,
        ]);

        return Redirect::back()->with('success', 'Taux de change modifié avec succès.');
    }

    public function destroy(Request $request, DailyExchangeRate $exchangeRate)
    {
        $user = $request->user();
        abort_unless($user->hasRole('finance') || $user->hasRole('admin'), 403, 'Action réservée au service Finance.');

        $active = DailyExchangeRate::getActiveRate();
        if ($active && $active->id === $exchangeRate->id && $exchangeRate->date_taux->isToday()) {
            return Redirect::back()->with('error', "Impossible de supprimer le taux actif du jour. Enregistrez d'abord un nouveau taux pour aujourd'hui si nécessaire.");
        }

        $dateLabel = $exchangeRate->date_taux->format('d/m/Y');
        $exchangeRate->delete();

        return Redirect::back()->with('success', "Taux de change du {$dateLabel} supprimé.");
    }
}