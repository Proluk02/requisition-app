<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CashRegister extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'code',
        'devise', // 'USD' ou 'FC'/'CDF'
        'solde_actuel',
        'solde_initial_dotation',
        'is_approvisionnee',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'solde_actuel' => 'float',
            'solde_initial_dotation' => 'float',
            'is_approvisionnee' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function cashiers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'cash_register_user');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(CashRegisterSession::class)->orderByDesc('created_at');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class)->orderByDesc('created_at');
    }

    public function activeSession(): HasOne
    {
        return $this->hasOne(CashRegisterSession::class)
            ->whereIn('status', ['ouverte', 'en_attente_autorisation'])
            ->latestOfMany();
    }

    public function lastClosedSession(): HasOne
    {
        return $this->hasOne(CashRegisterSession::class)
            ->where('status', 'fermee')
            ->latestOfMany('date_session');
    }

    public function initialDotationMovement(): HasOne
    {
        return $this->hasOne(CashMovement::class)
            ->where('is_approvisionnement_initial', true)
            ->where('status_validation', 'valide')
            ->latestOfMany();
    }

    public function isOuverte(): bool
    {
        return $this->sessions()
            ->where('status', 'ouverte')
            ->whereDate('date_session', now()->toDateString())
            ->exists();
    }
}
