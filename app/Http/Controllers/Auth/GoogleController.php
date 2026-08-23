<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Log;

class GoogleController extends Controller
{
    // Rediriger vers Google
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    // Gérer le retour de Google
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
            
            // Chercher l'utilisateur par son email
            $user = User::where('email', $googleUser->getEmail())->first();

            if ($user) {
                // Si l'utilisateur existe, on met à jour ses infos Google et on le connecte
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'last_login_at' => now(),
                ]);

                Auth::login($user);

                return redirect()->intended('/dashboard');
            } else {
                // RÈGLE IMPORTANTE : Pas d'auto-registration
                return redirect()->route('login')->withErrors([
                    'email' => 'Votre compte n\'est pas autorisé. Veuillez contacter l\'administrateur.',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Erreur Google Auth : ' . $e->getMessage());
            return redirect()->route('login')->withErrors([
                'email' => 'Erreur lors de la connexion avec Google.',
            ]);
        }
    }
}