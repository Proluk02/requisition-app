<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles; // AJOUTER CECI

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles; // AJOUTER HasRoles

    protected $fillable = [
        'name', 'first_name', 'last_name', 'email', 'password',
        'project_id', 'site_id', 'status', 'google_id'
    ];

    // Un utilisateur peut appartenir à un projet (Staff)
    public function project() {
        return $this->belongsTo(Project::class);
    }

    // Un utilisateur peut être affecté à un site (Coordonnateur)
    public function site() {
        return $this->belongsTo(Site::class);
    }
}