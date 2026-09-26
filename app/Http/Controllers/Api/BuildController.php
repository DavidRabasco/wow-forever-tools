<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Build;
use App\Models\WowClass;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Shareable builds: POST /api/builds stores a pick order, GET /api/builds/{hash}
// loads it. Stored shape: data = { picks: [slug, slug, ...] } in click order.
// ------------------------------------------------------------------
// Integrity: picks are replayed server-side with the SAME rules as the
// calculator (per-talent cap, 51 pool, maxed prerequisite, strict rows-above
// gate), so a shared link can never encode an illegal build.
class BuildController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'class_slug' => 'required|string|exists:classes,slug',
            'picks' => 'required|array|max:51',
            'picks.*' => 'string',
        ]);

        $class = WowClass::where('slug', $validated['class_slug'])
            ->with('trees.talents')
            ->firstOrFail();

        $error = $this->replayError($class, $validated['picks']);
        if ($error !== null) {
            return response()->json(['message' => $error], 422);
        }
        $picks = array_values($validated['picks']);

        // Deduplicate: identical picks reuse the existing hash instead of
        // minting a new row per click (our JSON encoding is canonical, so an
        // exact-text match on `data` is a reliable content comparison).
        $existing = Build::where('class_slug', $class->slug)
            ->where('data', json_encode(['picks' => $picks]))
            ->first();
        if ($existing) {
            return response()->json(['hash' => $existing->hash], 200);
        }

        // 6-char hash, retried on (unlikely) collision.
        $hash = null;
        for ($i = 0; $i < 10 && $hash === null; $i++) {
            $candidate = Str::random(6);
            if (!Build::where('hash', $candidate)->exists()) {
                $hash = $candidate;
            }
        }
        abort_if($hash === null, 500, 'Could not generate a unique build hash.');

        $build = Build::create([
            'hash' => $hash,
            'class_slug' => $class->slug,
            'data' => ['picks' => $picks],
            'version' => '0.1',
        ]);

        return response()->json(['hash' => $build->hash], 201);
    }

    public function show(string $hash)
    {
        $build = Build::where('hash', $hash)->firstOrFail();

        return response()->json([
            'hash' => $build->hash,
            'class_slug' => $build->class_slug,
            'picks' => $build->data['picks'] ?? [],
            'version' => $build->version,
        ]);
    }

    // Replays picks in order; returns null when legal, else an error message.
    // Mirrors calculator.js: canSpend with the strict rows-above gate.
    private function replayError(WowClass $class, array $picks): ?string
    {
        $bySlug = [];
        foreach ($class->trees as $tree) {
            foreach ($tree->talents as $talent) {
                $bySlug[$talent->slug] = ['talent' => $talent, 'tree' => $tree];
            }
        }

        $state = [];
        foreach ($picks as $index => $slug) {
            if (!isset($bySlug[$slug])) {
                return "Unknown talent '{$slug}' for this class (pick ".($index + 1).').';
            }
            ['talent' => $talent, 'tree' => $tree] = $bySlug[$slug];
            $rank = ($state[$slug] ?? 0) + 1;

            if ($rank > $talent->max_rank) {
                return "'{$talent->name}' exceeds rank {$talent->max_rank} (pick ".($index + 1).').';
            }
            if (array_sum($state) >= 51) {
                return 'Build exceeds the 51-point pool.';
            }
            if ($talent->requires_talent_id) {
                $parent = $tree->talents->firstWhere('id', $talent->requires_talent_id);
                if (!$parent || ($state[$parent->slug] ?? 0) < $parent->max_rank) {
                    return "'{$talent->name}' needs ".($parent ? "'{$parent->name}' maxed" : 'its prerequisite').' first.';
                }
            }
            $above = 0;
            foreach ($tree->talents as $peer) {
                if ($peer->row < $talent->row) {
                    $above += $state[$peer->slug] ?? 0;
                }
            }
            if ($above < ($talent->row - 1) * 5) {
                return "'{$talent->name}' needs ".(($talent->row - 1) * 5)." points in {$tree->name} rows above.";
            }

            $state[$slug] = $rank;
        }

        return null;
    }
}
