<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'full_name', 'description'];

    public function sites() {
        return $this->belongsToMany(Site::class);
    }

    public function users() {
        return $this->hasMany(User::class);
    }
}
