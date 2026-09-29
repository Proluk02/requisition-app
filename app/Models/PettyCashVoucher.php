<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashVoucher extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'requisition_id',
        'user_id',
        'numero_voucher',
        'company_name',
        'date_voucher',
        'account_code',
        'description',
        'montant_cdf',
        'montant_usd',
        'montant_en_lettres',
        'checked_by',
        'checked_at',
        'authorized_by',
        'authorized_at',
        'recipient_signature',
        'recipient_signed_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_voucher' => 'date',
            'montant_cdf' => 'float',
            'montant_usd' => 'float',
            'checked_at' => 'datetime',
            'authorized_at' => 'datetime',
            'recipient_signed_at' => 'datetime',
        ];
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(Requisition::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}