<?php

use App\Http\Controllers\ClassController;
use Illuminate\Support\Facades\Route;

// Root redirects to the default class (first in the config/forever.php
// catalog, currently /druid) so the app lands directly on a calculator.
Route::get('/', function () {
    $default = array_key_first(config('forever.classes')) ?? 'druid';

    return redirect()->to('/'.$default);
});

// Calculator pages: /paladin, /warrior, ... (slug must exist in DB,
// otherwise ClassController returns 404).
Route::get('/{class}', [ClassController::class, 'show'])->where('class', '[a-z]+');
