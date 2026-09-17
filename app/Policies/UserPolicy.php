<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function update(User $user, User $target): bool
    {
        return $user->hasRole('admin');
    }

    public function toggleStatus(User $user, User $target): bool
    {
        if (! $user->hasRole('admin')) {
            return false;
        }

        if ($user->is($target)) {
            return false; // Un admin ne peut pas se désactiver lui-même
        }

        if ($target->hasRole('admin') && $target->status === 'active' && User::role('admin')->where('status', 'active')->count() <= 1) {
            return false; // Impossible de désactiver le dernier admin actif
        }

        return true;
    }

    public function delete(User $user, User $target): bool
    {
        if (! $user->hasRole('admin')) {
            return false;
        }

        if ($user->is($target)) {
            return false; // Un admin ne peut pas se supprimer lui-même
        }

        if ($target->hasRole('admin') && User::role('admin')->count() <= 1) {
            return false; // Impossible de supprimer le dernier admin
        }

        return true;
    }
}