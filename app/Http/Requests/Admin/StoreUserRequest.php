<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Rules\Password::defaults()],
            'role' => ['required', 'string', 'exists:roles,name'],
            'status' => ['required', 'string', 'in:active,inactive'],
            'project_id' => [
                'nullable',
                'exists:projects,id',
                'required_unless:role,'.implode(',', [...User::UNASSIGNED_ROLES, ...User::SITE_ASSIGNED_ROLES]),
            ],
            'site_id' => [
                'nullable',
                'exists:sites,id',
                'required_if:role,'.implode(',', User::SITE_ASSIGNED_ROLES),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'project_id.required_unless' => 'Le projet est obligatoire pour ce rôle.',
            'site_id.required_if' => 'Le site est obligatoire pour un coordonnateur.',
        ];
    }
}