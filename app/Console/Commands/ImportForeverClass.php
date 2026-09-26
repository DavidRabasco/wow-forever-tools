<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

// Imports one Forever class from wowtbc.gg into our JSON data files.
// ------------------------------------------------------------------
// Usage: php artisan forever:import warrior
//
// What it does:
//  1. Downloads the class page-data.json (talentData: name/tree/row/col/ranks).
//  2. Writes database/data/{class}_{tree}.json, one per tree, with verbatim
//     per-rank texts (ranks[]), skill blocks, and requires_slug resolved
//     from pre_req ids (two passes: id->slug map first).
//  3. Looks up each icon in Wowhead Forever data (talents-classic db).
//     Misses stay null and are listed for manual fixing.
//  4. Probes the sunderarmor artwork pattern for backgrounds (verified only).
//  5. Merges the trees into database/data/classes.json (spec_icon left null
//     for manual fill: retail spec icons need human review).
//
// Never overwrites review fields blindly: is_gold follows the documented
// heuristic (1-rank skills at row 5+, capped by the capstone) and status is
// always 'unchanged'. Re-run to refresh; then reseed + review the TODO list.
class ImportForeverClass extends Command
{
    protected $signature = 'forever:import {class : lower-case class slug, e.g. warrior}';
    protected $description = 'Import a WoW Forever class talents into database/data JSON files';

    private const PAGE_DATA = 'https://wowtbc.gg/page-data/warcraftforever/talent-calculator/%s/page-data.json';
    private const WH_DATA = 'https://nether.wowhead.com/forever/data/talents-classic?dv=27&db=1790292378';
    private const BG_PATTERN = 'https://sunderarmor.com/WOW/Calculator/Backgrounds/NEW/%s_%s.jpg';
    private const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) wow-forever-tools-importer';

    public function handle(): int
    {
        $class = strtolower($this->argument('class'));

        $page = $this->fetch(sprintf(self::PAGE_DATA, $class));
        if ($page === null) {
            $this->error("Could not download page-data for '{$class}'.");
            return 1;
        }
        $talentData = $page['result']['pageContext']['talentData'] ?? null;
        if (!is_array($talentData)) {
            $this->error('Unexpected page-data shape (no result.pageContext.talentData).');
            return 1;
        }

        $whData = $this->fetch(self::WH_DATA, false);
        if ($whData === null) {
            $this->warn('Wowhead data unreachable: all icons will stay null.');
            $whRaw = '';
        } else {
            // fetch() decodes JSON; the WH endpoint returns JS, so refetch raw.
            $whRaw = $this->fetchRaw(self::WH_DATA) ?? '';
        }

        // Pass 1: id -> slug map (pre_req points at these ids).
        $idToSlug = [];
        foreach ($talentData as $entry) {
            $idToSlug[$entry['id']] = $this->slug($entry['name']);
        }

        // Group entries by tree display name, preserving page order.
        $trees = [];
        foreach ($talentData as $entry) {
            $trees[$entry['tree']][] = $entry;
        }

        $missingIcons = [];
        $order = 0;
        foreach ($trees as $treeName => $entries) {
            $order++;
            $treeSlug = $this->slug($treeName);
            $talents = [];
            foreach ($entries as $entry) {
                $slug = $idToSlug[$entry['id']];
                $row = (int) ltrim($entry['row'], 'r');
                $maxRank = (int) $entry['total_ranks'];
                $ranks = isset($entry['value']) ? array_map(fn($v) => trim($v), (array) $entry['value']) : null;
                $skill = $entry['skill'] ?? null;
                $icon = $this->findIcon($whRaw, $entry['name']);
                if ($icon === null) {
                    $missingIcons[] = $entry['name'];
                }
                $talents[] = [
                    'row' => $row,
                    'col' => (int) ltrim($entry['column'], 'c'),
                    'slug' => $slug,
                    'name' => $entry['name'],
                    'max_rank' => $maxRank,
                    // Heuristic: 1-rank actives at row 5+ read as gold/marquee
                    // talents (matches the hand-reviewed Paladin flags).
                    'is_gold' => $maxRank === 1 && $row >= 5,
                    'requires_slug' => isset($entry['pre_req']) ? ($idToSlug[$entry['pre_req']] ?? null) : null,
                    'status' => 'unchanged',
                    'description' => $ranks[0] ?? ($skill['description'] ?? ''),
                    'ranks' => $ranks,
                    'skill' => $skill,
                    'icon' => $icon,
                ];
            }

            $file = "{$class}_{$treeSlug}.json";
            $payload = [
                '_source' => sprintf(self::PAGE_DATA, $class).' (talentData, '.$treeName.' tree).',
                '_attribution' => 'Data (c) wowtbc.gg / Blizzard. Educational use. Icons (c) Blizzard via wow.zamimg.com, short names only.',
                '_notes' => 'Auto-imported by forever:import (verbatim ranks). is_gold follows the 1-rank-at-row-5+ heuristic; VERIFY on Wowhead Forever once the beta opens. status=unchanged provisional.',
                'talents' => $talents,
            ];
            file_put_contents(
                base_path('database/data/'.$file),
                json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL
            );
            $this->line("wrote database/data/{$file} (".count($talents).' talents)');

            $this->mergeManifest($class, $treeSlug, $treeName, $order, $file);
        }

        if ($missingIcons) {
            $this->warn('Icons NOT found (null, fix by hand): '.implode(', ', array_unique($missingIcons)));
        } else {
            $this->info('All icons resolved.');
        }
        $this->info('Next: fill spec_icon in classes.json, run the seeder, verify.');
        return 0;
    }

    // Merges one tree into classes.json (creates the class entry if missing).
    // background = probed artwork URL or null; spec_icon always null here.
    private function mergeManifest(string $class, string $treeSlug, string $treeName, int $order, string $file): void
    {
        $path = base_path('database/data/classes.json');
        $manifest = json_decode(file_get_contents($path), true);
        $manifest['classes'][$class]['name'] ??= ucfirst($class);
        $bg = sprintf(self::BG_PATTERN, $treeSlug, $class);
        $manifest['classes'][$class]['trees'][$treeSlug] = [
            'name' => $treeName,
            'order' => $order,
            'file' => $file,
            'background' => $this->urlExists($bg) ? $bg : null,
            'spec_icon' => $manifest['classes'][$class]['trees'][$treeSlug]['spec_icon'] ?? null,
        ];
        if ($manifest['classes'][$class]['trees'][$treeSlug]['background'] === null) {
            $this->warn("background unverified (null): {$bg}");
        }
        file_put_contents($path, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL);
    }

    // ASCII kebab slug: "Guardian's Favor" -> "guardians-favor".
    private function slug(string $name): string
    {
        $slug = strtolower($name);
        $slug = str_replace("'", '', $slug);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        return trim($slug, '-');
    }

    // Exact name_enus -> icon lookup in the Wowhead data dump.
    private function findIcon(string $raw, string $name): ?string
    {
        if ($raw === '') {
            return null;
        }
        if (preg_match('/"name_enus":"'.preg_quote($name, '/').'","icon":"([^"]+)"/', $raw, $m)) {
            return $m[1];
        }
        return null;
    }

    private function fetch(string $url, bool $json = true): mixed
    {
        $raw = $this->fetchRaw($url);
        if ($raw === null) {
            return null;
        }
        return $json ? json_decode($raw, true) : $raw;
    }

    private function fetchRaw(string $url): ?string
    {
        $ctx = stream_context_create(['http' => ['header' => 'User-Agent: '.self::UA, 'timeout' => 60]]);
        $raw = @file_get_contents($url, false, $ctx);
        return $raw === false ? null : $raw;
    }

    private function urlExists(string $url): bool
    {
        // get_headers() over streams (PHP curl on Windows ships without a CA
        // bundle, so curl HTTPS probes fail while streams work).
        $ctx = stream_context_create(['http' => ['method' => 'HEAD', 'header' => 'User-Agent: '.self::UA, 'timeout' => 20]]);
        $headers = @get_headers($url, false, $ctx);
        return is_array($headers) && str_contains($headers[0] ?? '', '200');
    }
}
