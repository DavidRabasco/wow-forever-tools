<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\WowClassController;
use App\Http\Controllers\Api\BuildController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Generic endpoint for every class.
Route::get('/classes/{slug}', [WowClassController::class, 'show']);
// Shareable builds: store a pick order, load it back by hash.
Route::post('/builds', [BuildController::class, 'store']);
Route::get('/builds/{hash}', [BuildController::class, 'show']);
