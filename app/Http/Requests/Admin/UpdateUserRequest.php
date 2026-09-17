<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('user'));
    }

    public function rules(): array
    {
        /** @var User $target */
        $target = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'password' => ['nullable', Rules\Password::defaults()],
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