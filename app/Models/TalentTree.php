<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TalentTree extends Model
{
    protected $table = 'talent_trees';

    public function wowClass()
    {
        return $this->belongsTo(WowClass::class, 'class_id', 'id');
    }

    public function talents()
    {
        return $this->hasMany(Talent::class, 'tree_id', 'id');
    }
}
