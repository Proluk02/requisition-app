<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyExchangeRate extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'daily_exchange_rates';

    protected $fillable = [
        'date_taux',
        'taux_eur_usd',
        'taux_eur_cdf',
        'updated_by',
    ];

    protected $casts = [
        'date_taux' => 'date',
        'taux_eur_usd' => 'float',
        'taux_eur_cdf' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function getActiveRate(): ?self
    {
        return self::where('date_taux', now()->toDateString())->first()
            ?? self::orderByDesc('date_taux')->first();
    }

    /**
     * Convertit un montant donné dans la devise source vers l'Euro (€).
     *
     * @param  string  $devise  (EUR, USD, FC/CDF)
     * @param  DailyExchangeRate|null  $rate  (optionnel, prend le taux actif par défaut)
     * @return array [montant_eur, taux_usd, taux_cdf]
     */
    public static function convertToEur(float $montant, string $devise, ?self $rate = null): array
    {
        $rate = $rate ?? self::getActiveRate();
        $devise = strtoupper(trim($devise));

        $tauxUsd = $rate ? (float) $rate->taux_eur_usd : 1.08;
        $tauxCdf = $rate ? (float) $rate->taux_eur_cdf : 3050.0;

        if ($devise === 'EUR') {
            return [
                'montant_eur' => round($montant, 2),
                'taux_eur_usd' => $tauxUsd,
                'taux_eur_cdf' => $tauxCdf,
            ];
        }

        if ($devise === 'USD') {
            $montantEur = $tauxUsd > 0 ? ($montant / $tauxUsd) : $montant;

            return [
                'montant_eur' => round($montantEur, 2),
                'taux_eur_usd' => $tauxUsd,
                'taux_eur_cdf' => $tauxCdf,
            ];
        }

        if (in_array($devise, ['FC', 'CDF'])) {
            $montantEur = $tauxCdf > 0 ? ($montant / $tauxCdf) : $montant;

            return [
                'montant_eur' => round($montantEur, 2),
                'taux_eur_usd' => $tauxUsd,
                'taux_eur_cdf' => $tauxCdf,
            ];
        }

        return [
            'montant_eur' => round($montant, 2),
            'taux_eur_usd' => $tauxUsd,
            'taux_eur_cdf' => $tauxCdf,
        ];
    }
}
