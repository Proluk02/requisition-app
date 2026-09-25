<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class LocaleController extends Controller
{
    public function switch(Request $request, string $locale)
    {
        if (in_array($locale, ['fr', 'en'])) {
            session(['locale' => $locale]);
            App::setLocale($locale);
            cookie()->queue('locale', $locale, 60 * 24 * 365); // 1 an
        }

        return back();
    }
}