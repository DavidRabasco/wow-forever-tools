<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Talent extends Model
{
    protected $table = 'talents';

    // JSON columns decode to arrays automatically (API serves them as arrays).
    protected $casts = [
        'ranks' => 'array',
        'skill' => 'array',
        'is_gold' => 'boolean',
    ];

    public function tree()
    {
        return $this->belongsTo(TalentTree::class, 'tree_id', 'id');
    }

    public function requires()
    {
        return $this->belongsTo(Talent::class, 'requires_talent_id', 'id');
    }
}
