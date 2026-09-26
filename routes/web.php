<?php

use App\Http\Controllers\Api\PaladinController;
use App\Http\Controllers\Api\WowClassController;
use App\Http\Controllers\ClassController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Calculator pages: /paladin, /warrior, ... (slug must exist in DB,
// otherwise ClassController returns 404).
Route::get('/{class}', [ClassController::class, 'show'])->where('class', '[a-z]+');
