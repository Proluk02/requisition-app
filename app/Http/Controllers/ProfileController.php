<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'hasPin' => $user->hasSignaturePin(),
            'pinSetAt' => $user->pin_set_at?->format('d/m/Y à H:i'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('success', 'Profil mis à jour avec succès.');
    }

    /**
     * Configuration et mise à jour du Code PIN de signature (Spécification #6).
     * Exige le mot de passe actuel pour créer ou modifier le PIN.
     */
    public function updatePin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'pin' => ['required', 'string', 'digits_between:4,6', 'confirmed'],
        ], [
            'current_password.current_password' => 'Le mot de passe actuel saisi est incorrect.',
            'pin.digits_between' => 'Le code PIN doit comporter obligatoirement entre 4 et 6 chiffres.',
            'pin.confirmed' => 'La confirmation du code PIN ne correspond pas.',
        ]);

        $request->user()->update([
            'signature_pin' => Hash::make($validated['pin']),
            'pin_set_at' => now(),
        ]);

        return Redirect::route('profile.edit')->with('success', 'Code PIN de signature enregistré avec succès.');
    }
}
