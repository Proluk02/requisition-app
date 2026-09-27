<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Demande extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'demandes';

    protected $fillable = [
        'requisition_id',
        'activite',
        'code_all_budget',
        'code_allocation',
        'nature',
        'quantite',
        'duree',
        'unite',
        'frais_unitaire',
        'total_ligne',
    ];

    protected function casts(): array
    {
        return [
            'quantite' => 'float',
            'duree' => 'float',
            'frais_unitaire' => 'float',
            'total_ligne' => 'float',
        ];
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(Requisition::class);
    }

    public function justificatifs(): HasMany
    {
        return $this->hasMany(DemandeJustificatif::class);
    }
}
