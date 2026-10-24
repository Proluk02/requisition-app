<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegisterSession extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'cash_register_id',
        'previous_session_id',
        'origine_ouverture', // report_veille | approvisionnement_initial
        'approvisionnement_movement_id',
        'cashier_id',
        'authorized_by',
        'date_session',
        'solde_ouverture',
        'solde_theorique_cloture',
        'solde_fermeture',
        'ecart_caisse',
        'justification_ecart',
        'total_entrees',
        'total_sorties',
        'status', // en_attente_autorisation | ouverte | fermee
        'opened_at',
        'closed_at',
        'observation_ouverture',
        'observation_cloture',
    ];

    protected function casts(): array
    {
        return [
            'date_session' => 'date',
            'solde_ouverture' => 'float',
            'solde_theorique_cloture' => 'float',
            'solde_fermeture' => 'float',
            'ecart_caisse' => 'float',
            'total_entrees' => 'float',
            'total_sorties' => 'float',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    public function previousSession(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class, 'previous_session_id');
    }

    public function approvisionnementMovement(): BelongsTo
    {
        return $this->belongsTo(CashMovement::class, 'approvisionnement_movement_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class, 'session_id')->orderByDesc('created_at');
    }
}
