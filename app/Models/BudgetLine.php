<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetLine extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'project_id',
        'donor_id',
        'code',
        'category_code',
        'subcategory_code',
        'descript_code',
        'split_code',
        'libelle',
        'devise',
        'budget_initial',
        'montant_engage',
        'montant_decaisse',
        'solde',
    ];

    protected function casts(): array
    {
        return [
            'budget_initial' => 'float',
            'montant_engage' => 'float',
            'montant_decaisse' => 'float',
            'solde' => 'float',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class);
    }

    public function cashMovements(): HasMany
    {
        return $this->hasMany(CashMovement::class);
    }

    /**
     * Taux de consommation budgétaire réel en pourcentage.
     */
    public function getTauxConsommationAttribute(): float
    {
        if ($this->budget_initial <= 0) {
            return 0.0;
        }

        return round(($this->montant_decaisse / $this->budget_initial) * 100, 2);
    }

    /**
     * Reconstitue le code complet à partir des segments selon la formule Excel.
     */
    public static function buildCode(?string $cat, ?string $subcat, ?string $desc, ?string $split): string
    {
        $parts = array_filter([$cat, $subcat, $desc, $split], fn ($p) => filled($p));
        return implode('.', $parts);
    }
}