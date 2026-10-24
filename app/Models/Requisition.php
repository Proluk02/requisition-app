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
        'cashier_id',
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
        'mode_paiement',
        'reference_paiement',
        'date_decaissement',
    ];

    protected function casts(): array
    {
        return [
            'montant_total' => 'float',
            'is_urgent' => 'boolean',
            'date_paiement' => 'date',
            'date_livraison' => 'date',
            'date_decaissement' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function demandes(): HasMany
    {
        return $this->hasMany(Demande::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(RequisitionSignature::class)->orderBy('signed_at', 'asc');
    }

    public function pettyCashVouchers(): HasMany
    {
        return $this->hasMany(PettyCashVoucher::class)->orderBy('created_at', 'asc');
    }
}
