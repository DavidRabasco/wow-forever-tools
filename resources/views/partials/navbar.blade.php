@php
    $current = $current ?? '';
    $defaultClass = array_key_first(config('forever.classes')) ?? 'druid';
    $calculatorSlug = $calculatorSlug ?? $defaultClass;
    $baseLink = 'text-sm font-semibold pb-0.5 border-b-2 transition-colors';
    $activeLink = 'border-[#ffd100] text-white';
    $idleLink = 'border-transparent text-neutral-300 hover:text-white';
@endphp
{{-- Shared site navigation. The static exporter rewrites the absolute href
     values to sibling .html files, so the same markup works in Laravel and in
     dist/. --}}
<header class="sticky top-0 z-40 min-w-0 border-b border-[#6b5a2e] bg-black/85 backdrop-blur">
    <nav class="mx-auto flex w-full min-w-0 max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-x-6">
        <a href="/" class="flex items-center gap-2">
            <img src="https://sunderarmor.com/WOWFOREVER/UI/logo_icon_4.png"
                 alt="WoW Forever logo" class="h-8 w-8" onerror="this.remove()">
            <span class="text-base font-bold sm:text-lg" style="color:#ffd100">WoW Forever Tools</span>
        </a>
        <a href="/{{ $calculatorSlug }}" class="{{ $baseLink }} {{ $current === 'calculator' ? $activeLink : $idleLink }}">
            Talent Calculator
        </a>
        <a href="/raid-comp" class="{{ $baseLink }} {{ $current === 'raid-comp' ? $activeLink : $idleLink }}">
            Raid Comp
        </a>
        <a href="/bis" class="{{ $baseLink }} {{ $current === 'bis' ? $activeLink : $idleLink }}">
            BiS Lists
        </a>
        <a href="/about" class="{{ $baseLink }} {{ $current === 'about' ? $activeLink : $idleLink }}">
            About
        </a>
    </nav>
</header>
