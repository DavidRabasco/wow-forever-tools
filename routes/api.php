<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaladinController;
use App\Http\Controllers\Api\WowClassController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Legacy alias kept for bookmarks.
Route::get('/paladin', [PaladinController::class, 'show']);
// Generic endpoint for every class.
Route::get('/classes/{slug}', [WowClassController::class, 'show']);
