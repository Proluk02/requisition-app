<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
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

        // Langue de session ou de cookie ou par défaut 'fr'
        $locale = $request->session()->get('locale', $request->cookie('locale', 'fr'));
        app()->setLocale($locale);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'locale' => $locale,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}