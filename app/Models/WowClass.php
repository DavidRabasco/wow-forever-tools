<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WowClass extends Model
{
    protected $table = 'classes';
    protected $fillable = ['slug', 'name'];

    public function trees(): HasMany
    {
        return $this->hasMany(TalentTree::class, 'class_id', 'id');
    }
    
}
