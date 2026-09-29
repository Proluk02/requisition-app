<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requisition extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'project_id',
        'numero_requisition',
        'nature_requisition',
        'projet',
        'project_code',
        'caisse_decaissement',
        'devise',
        'observation',
        'montant_total',
        'status',
        'is_urgent',
        'date_paiement',
        'date_livraison',
    ];

    protected function casts(): array
    {
        return [
            'montant_total' => 'float',
            'is_urgent' => 'boolean',
            'date_paiement' => 'date',
            'date_livraison' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function demandes(): HasMany
    {
        return $this->hasMany(Demande::class);
    }

    // Relation avec les signatures électroniques horodatées
    public function signatures(): HasMany
    {
        return $this->hasMany(RequisitionSignature::class)->orderBy('signed_at', 'asc');
    }

    // Relation avec les vouchers de petite caisse pour justification transport
    public function pettyCashVouchers(): HasMany
    {
        return $this->hasMany(PettyCashVoucher::class)->orderBy('created_at', 'asc');
    }
}