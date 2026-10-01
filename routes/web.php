<?php

use App\Http\Controllers\ClassController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Calculator pages: /paladin, /warrior, ... (slug must exist in DB,
// otherwise ClassController returns 404).
Route::get('/{class}', [ClassController::class, 'show'])->where('class', '[a-z]+');
