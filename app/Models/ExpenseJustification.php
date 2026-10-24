<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseJustification extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'requisition_id',
        'cash_movement_id',
        'user_id',
        'project_manager_id',
        'cashier_id',
        'numero_return_form',
        'code_activite',
        'imputation',
        'reference_bon_sortie',
        'montant_recu',
        'montant_utilise',
        'solde',
        'devise',
        'status',
        'apure_at',
    ];

    protected function casts(): array
    {
        return [
            'montant_recu' => 'float',
            'montant_utilise' => 'float',
            'solde' => 'float',
            'apure_at' => 'datetime',
        ];
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(Requisition::class);
    }

    public function cashMovement(): BelongsTo
    {
        return $this->belongsTo(CashMovement::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ExpenseJustificationLine::class, 'justification_id')->orderBy('date_depense', 'asc');
    }

    /**
     * Recalcule automatiquement le montant utilisé et le solde restant.
     */
    public function recalculerSolde(): void
    {
        $total = $this->lines()->sum(
            $this->devise === 'FC' ? 'montant_cdf' : 'montant_usd'
        );

        $this->update([
            'montant_utilise' => $total,
            'solde' => round($this->montant_recu - $total, 2),
        ]);
    }
}
