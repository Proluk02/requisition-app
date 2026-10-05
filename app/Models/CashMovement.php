<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CashMovement extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'cash_register_id',
        'session_id',
        'cashier_id',
        'requisition_id',
        'budget_line_id',
        'type',
        'numero_piece',
        'date_mouvement',
        'tiers_nom',
        'montant',
        'devise',
        'montant_en_lettres',
        'motif',
        'imputation',
        'mode_paiement',
        'reference_externe',
        'signature_tiers',
        'signature_caissier',
        'signature_responsable',
    ];

    protected function casts(): array
    {
        return [
            'date_mouvement' => 'date',
            'montant' => 'float',
        ];
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class, 'session_id');
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(Requisition::class);
    }

    public function budgetLine(): BelongsTo
    {
        return $this->belongsTo(BudgetLine::class);
    }

    public function justification(): HasOne
    {
        return $this->hasOne(ExpenseJustification::class);
    }

    public function isEntree(): bool
    {
        return $this->type === 'entree';
    }

    public function isSortie(): bool
    {
        return $this->type === 'sortie';
    }
}