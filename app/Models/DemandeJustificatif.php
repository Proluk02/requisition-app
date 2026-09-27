<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeJustificatif extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'demande_id',
        'description',
        'date',
        'montant',
        'file_path',
        'original_name',
        'mime_type',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(Demande::class);
    }
}
