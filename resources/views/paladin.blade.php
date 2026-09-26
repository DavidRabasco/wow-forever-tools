<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paladin - WoW Forever</title>
    @vite(['resources/css/app.css', 'resources/js/paladin.js'])
</head>
<body class="bg-neutral-900 text-white p-4">
{{-- Top navbar: logo + site name pinned left, section links after it.
     To add future tools, append more <a> links inside <nav>.
     Logo hotlinked (sunderarmor/wowtbc.gg, educational use); if it ever
     dies the onerror drops it and the site name still shows. --}}
<header class="sticky top-0 z-40 -m-4 mb-4 border-b border-[#6b5a2e] bg-black/80 backdrop-blur">
<nav class="flex items-center gap-6 px-4 py-2">
<a href="/paladin" class="flex items-center gap-2">
<img src="https://sunderarmor.com/WOWFOREVER/UI/logo_icon_4.png" alt="WoW Forever logo" class="h-8 w-8" onerror="this.remove()">
<span class="text-lg font-bold" style="color:#ffd100">WoW Forever Tools</span>
</a>
<a href="/paladin" class="text-sm font-semibold text-white border-b-2 border-[#ffd100] pb-0.5">Talent Calculator</a>
</nav>
</header>
{{-- Class selector bar: the 9 Forever classes, left to right. Only Paladin
     has data so far: it renders selected (gold glow), the rest dimmed with a
     "coming soon" tooltip and no action. Wiring another class = its JSON data
     + seeder + API/JS generalization + marking it selected here.
     Icons hotlinked (sunderarmor, educational use), same set as the reference. --}}
@php
$classes = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
$selectedClass = 'Paladin';
@endphp
<div class="flex justify-center gap-3 mt-4 flex-wrap">
@foreach ($classes as $class)
@php $isSelected = $class === $selectedClass; @endphp
<button type="button" title="{{ $class }}{{ $isSelected ? '' : ' (coming soon)' }}"
class="flex flex-col items-center gap-1 rounded p-1 border-2 {{ $isSelected ? 'border-[#ffd100]' : 'border-neutral-700 opacity-50 hover:opacity-100' }}"
@if ($isSelected) style="box-shadow:0 0 12px rgba(255,209,0,0.8)" @endif>
<img src="https://sunderarmor.com/WOW/Classes/Old/{{ strtolower($class) }}.png" alt="{{ $class }}" class="w-12 h-12 rounded" onerror="this.remove()">
<span class="text-[11px] leading-none {{ $isSelected ? 'font-bold' : 'text-neutral-400' }}" @if ($isSelected) style="color:#ffd100" @endif>{{ $class }}</span>
</button>
@endforeach
</div>
{{-- Exact-center layout: 3-column grid [spacer | trees | panel] on wide screens.
     Equal 1fr tracks center the trees on the page; the list sits in the right
     track, adjacent to them. Below 1200px it stacks centered (side-by-side
     cannot physically fit there). --}}
<div class="mt-4 grid grid-cols-1 min-[1200px]:grid-cols-[1fr_auto_1fr] gap-6 items-start justify-items-center">
<div class="hidden min-[1200px]:block"></div>
<div id="trees" class="min-w-0">Loading...</div>
{{-- Height-capped to the trees: the panel stretches to the row height (the
     trees set it) and the list scrolls inside, so they always match. --}}
<aside id="pick-panel" class="w-max max-w-full rounded border border-neutral-700 bg-black/40 p-3 min-[1200px]:justify-self-start min-[1200px]:self-stretch flex flex-col overflow-hidden">
<h2 class="text-lg font-bold" style="color:#ffd100">Pick Order</h2>
<div id="pick-level" class="text-sm text-neutral-300 mb-2">Level 9</div>
{{-- Single column with internal scroll; rows stay on one line (see renderPickOrder). --}}
<ol id="pick-order" class="flex-1 min-h-0 overflow-y-auto"></ol>
</aside>
</div>
</body>
</html>
