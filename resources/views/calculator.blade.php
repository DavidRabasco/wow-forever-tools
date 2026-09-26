<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $wowClass->name }} - WoW Forever</title>
    @vite(['resources/css/app.css', 'resources/js/calculator.js'])
</head>
<body class="bg-neutral-900 text-white p-4">
{{-- Top navbar: logo + site name pinned left, section links after it.
     To add future tools, append more <a> links inside <nav>.
     Logo hotlinked (sunderarmor/wowtbc.gg, educational use); if it ever
     dies the onerror drops it and the site name still shows. --}}
<header class="sticky top-0 z-40 -m-4 mb-4 border-b border-[#6b5a2e] bg-black/80 backdrop-blur">
<nav class="flex items-center gap-6 px-4 py-2">
<a href="/{{ $wowClass->slug }}" class="flex items-center gap-2">
<img src="https://sunderarmor.com/WOWFOREVER/UI/logo_icon_4.png" alt="WoW Forever logo" class="h-8 w-8" onerror="this.remove()">
<span class="text-lg font-bold" style="color:#ffd100">WoW Forever Tools</span>
</a>
<a href="/{{ $wowClass->slug }}" class="text-sm font-semibold text-white border-b-2 border-[#ffd100] pb-0.5">Talent Calculator</a>
</nav>
</header>
{{-- Class selector bar: the 9 Forever classes, left to right, driven by the
     backend ($classes: icon/available/selected). Seeded classes link to their
     page and the current one glows gold; the rest render dimmed with a
     "coming soon" tooltip and no action. Icons hotlinked (sunderarmor). --}}
<div class="flex justify-center gap-3 mt-4 flex-wrap">
@foreach ($classes as $class)
@if ($class['available'])
<a href="/{{ $class['slug'] }}" title="{{ $class['name'] }}"
class="flex flex-col items-center gap-1 rounded p-1 border-2 {{ $class['selected'] ? 'border-[#ffd100]' : 'border-neutral-700 opacity-50 hover:opacity-100' }}"
@if ($class['selected']) style="box-shadow:0 0 12px rgba(255,209,0,0.8)" @endif>
<img src="{{ $class['icon'] }}" alt="{{ $class['name'] }}" class="w-12 h-12 rounded" onerror="this.remove()">
<span class="text-[11px] leading-none {{ $class['selected'] ? 'font-bold' : 'text-neutral-400' }}" @if ($class['selected']) style="color:#ffd100" @endif>{{ $class['name'] }}</span>
</a>
@else
<button type="button" title="{{ $class['name'] }} (coming soon)"
class="flex flex-col items-center gap-1 rounded p-1 border-2 border-neutral-700 opacity-50 hover:opacity-100">
<img src="{{ $class['icon'] }}" alt="{{ $class['name'] }}" class="w-12 h-12 rounded" onerror="this.remove()">
<span class="text-[11px] leading-none text-neutral-400">{{ $class['name'] }}</span>
</button>
@endif
@endforeach
</div>
{{-- Exact-center layout: 3-column grid [toolbar | trees | panel] on wide screens.
     Equal 1fr tracks center the trees on the page; the list sits in the right
     track, adjacent to them. Below 1200px it stacks centered (side-by-side
     cannot physically fit there). --}}
<div class="mt-4 grid grid-cols-1 min-[1200px]:grid-cols-[1fr_auto_1fr] gap-6 items-start justify-items-center">
{{-- Left rail: global reset + remaining pool counter (both JS-owned). Centered
     above the trees on narrow screens, hugging the trees on wide ones. The
     fixed 300px width balances the right pick panel so the trees stay exactly
     centered (equal side widths); content right-aligns toward the trees. --}}
<div class="min-[1200px]:justify-self-end min-[1200px]:w-[300px]">
<div class="flex flex-row min-[1200px]:flex-col items-center min-[1200px]:items-end gap-2">
<label class="text-sm text-neutral-300">Level
<select id="level-select" title="Cap the point pool to simulate lower levels (60 = full 51 points)"
class="bg-neutral-800 border border-neutral-700 rounded text-sm px-1 py-0.5"></select>
</label>
<button id="reset-build" type="button" title="Remove all points and restore the 51-point pool"
class="px-4 py-1 rounded border-2 border-[#6b5a2e] bg-[#3a0d0d] hover:bg-[#5a1414] text-sm font-bold" style="color:#ffd100">Reset</button>
<button id="share-build" type="button" title="Save this build and copy its link"
class="px-4 py-1 rounded border-2 border-[#6b5a2e] bg-[#0d2a3a] hover:bg-[#143d55] text-sm font-bold" style="color:#ffd100">Share</button>
<span id="points-remaining" class="text-sm text-neutral-300">51 remaining</span>
<div id="share-status" class="text-xs text-neutral-400"></div>
</div>
</div>
{{-- data-api/class tell calculator.js which class endpoint to load. --}}
<div id="trees" class="min-w-0" data-api="/api/classes/{{ $wowClass->slug }}" data-class="{{ $wowClass->slug }}">Loading...</div>
{{-- Height-capped to the trees by JS (syncPanelHeight): inline max-height makes
     the list scroll inside instead of growing the page. flex-col + min-h-0
     on the <ol> are required for that inner scroll to work. --}}
<aside id="pick-panel" class="w-max max-w-full rounded border border-neutral-700 bg-black/40 p-3 min-[1200px]:justify-self-start min-[1200px]:self-stretch flex flex-col overflow-hidden">
<h2 class="text-lg font-bold" style="color:#ffd100">Pick Order</h2>
<div id="pick-level" class="text-sm text-neutral-300 mb-2">Level 10</div>
{{-- Single column with internal scroll; rows stay on one line (see renderPickOrder). --}}
<ol id="pick-order" class="flex-1 min-h-0 overflow-y-auto"></ol>
</aside>
</div>
</body>
</html>
