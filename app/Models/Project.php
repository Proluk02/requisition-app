<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'name',
        'full_name',
        'description',
    ];

    public function sites(): BelongsToMany
    {
        return $this->belongsToMany(Site::class, 'project_site');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
