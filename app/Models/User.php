<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, HasRoles, HasUuids, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    public const UNASSIGNED_ROLES = ['admin', 'director'];

    public const SITE_ASSIGNED_ROLES = ['coordinator'];

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'signature_pin', 
        'pin_set_at',
        'project_id',
        'site_id',
        'role',
        'status',
        'google_id',
        'avatar',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'signature_pin',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'signature_pin' => 'hashed',
            'last_login_at' => 'datetime',
            'pin_set_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function requisitions(): HasMany
    {
        return $this->hasMany(Requisition::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(RequisitionSignature::class);
    }

    public static function roleRequiresSite(?string $role): bool
    {
        return in_array($role, self::SITE_ASSIGNED_ROLES, true);
    }

    public static function roleRequiresProject(?string $role): bool
    {
        return ! in_array($role, [...self::UNASSIGNED_ROLES, ...self::SITE_ASSIGNED_ROLES], true);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
    public function hasSignaturePin(): bool
    {
        return ! empty($this->signature_pin);
    }
}