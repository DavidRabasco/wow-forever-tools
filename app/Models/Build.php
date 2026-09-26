<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Build extends Model
{
    protected $fillable = ['hash', 'class_slug', 'data', 'version'];

    // Picks array decodes automatically.
    protected $casts = [
        'data' => 'array',
    ];
}
