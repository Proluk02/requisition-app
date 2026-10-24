<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseJustificationLine extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'justification_id',
        'date_depense',
        'description',
        'montant_usd',
        'montant_cdf',
        'remarques',
    ];

    protected function casts(): array
    {
        return [
            'date_depense' => 'date',
            'montant_usd' => 'float',
            'montant_cdf' => 'float',
        ];
    }

    public function justification(): BelongsTo
    {
        return $this->belongsTo(ExpenseJustification::class, 'justification_id');
    }
}
