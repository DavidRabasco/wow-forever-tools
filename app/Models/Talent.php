<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Talent extends Model
{
    protected $table = 'talents';

    public function tree()
    {
        return $this->belongsTo(TalentTree::class, 'tree_id', 'id');
    }

    public function requires()
    {
        return $this->belongsTo(Talent::class, 'requires_talent_id', 'id');
    }
}
