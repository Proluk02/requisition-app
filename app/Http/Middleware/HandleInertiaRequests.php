<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            $user->load([
                'project:id,name,full_name',
                'site:id,name,location',
                'roles:id,name',
            ]);
        }

        // CHARGEMENT EXCLUSIF DES NOTIFICATIONS NON LUES (DISPARAISSENT DÈS QU'ELLES SONT LUES)
        $userNotifications = [];
        if ($user) {
            $userNotifications = $user->unreadNotifications()
                ->latest()
                ->limit(20)
                ->get()
                ->map(function ($n) {
                    $payload = is_array($n->data) ? $n->data : (json_decode($n->data, true) ?: []);

                    return [
                        'id' => (string) $n->id,
                        'titre' => $payload['titre'] ?? 'Notification Système',
                        'message' => $payload['message'] ?? '',
                        'date' => $n->created_at?->format('d/m/Y H:i') ?? '',
                        'lu' => false,
                        'urgent' => (bool) ($payload['urgent'] ?? false),
                    ];
                })
                ->all();
        }

        // Langue de session ou de cookie ou par défaut 'fr'
        $locale = $request->session()->get('locale', $request->cookie('locale', 'fr'));
        app()->setLocale($locale);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'notifications' => $userNotifications,
            'locale' => $locale,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}