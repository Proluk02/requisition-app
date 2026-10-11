<?php

use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use App\Http\Middleware\SetLocale;
use Spatie\Permission\Middleware\RoleMiddleware;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            SetLocale::class,   
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'active' => EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        
        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request) {
            
            // J'AI ENLEVÉ LA CONDITION "app()->environment()".
            // Maintenant, l'erreur s'affichera tout le temps, même en local !
            if (in_array($response->getStatusCode(), [500, 503, 404, 403, 401, 419, 429])) {
                
                // On vérifie si Inertia veut répondre
                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            } 
            elseif ($response->getStatusCode() === 419) {
                return back()->with([
                    'message' => 'La session a expiré, veuillez réessayer.',
                ]);
            }

            return $response;
        });

    })->create();