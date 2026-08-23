<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Site extends Model
{
    protected $fillable = ['name', 'location'];

    public function projects() {
        return $this->belongsToMany(Project::class);
    }

    public function coordinators() {
        return $this->hasMany(User::class);
    }
}