@extends('layouts.site')

@section('content')
@php
    $defaultClass = array_key_first(config('forever.classes')) ?? 'druid';
@endphp

<section class="py-10 text-center">
    <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">WoW Forever</p>
    <h1 class="mt-2 break-words text-3xl font-bold sm:text-4xl" style="color:#ffd100">WoW Forever Tools</h1>
    <p class="mx-auto mt-3 max-w-2xl text-neutral-300">
        Plan talent builds, check raid buff and debuff coverage, and find the
        best items for your character. All in one place, free, with no account.
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/{{ $defaultClass }}"
           class="rounded border-2 border-[#6b5a2e] bg-[#3a0d0d] px-5 py-2 text-sm font-bold hover:bg-[#5a1414]"
           style="color:#ffd100">Open the talent calculator</a>
        <a href="/raid-comp"
           class="rounded border-2 border-neutral-700 bg-neutral-800 px-5 py-2 text-sm font-semibold hover:border-[#6b5a2e]">
            Raid Comp <span class="text-neutral-400">(in development)</span>
        </a>
        <a href="/bis"
           class="rounded border-2 border-neutral-700 bg-neutral-800 px-5 py-2 text-sm font-semibold hover:border-[#6b5a2e]">
            BiS Lists <span class="text-neutral-400">(in development)</span>
        </a>
    </div>
</section>

<section class="mt-6">
    <div class="mb-3 flex items-end justify-between gap-4">
        <h2 class="text-xl font-bold" style="color:#ffd100">Choose a class</h2>
        <p class="text-xs text-neutral-400">9 classes, 3 trees, 51 points at level 60</p>
    </div>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        @foreach ($classes as $class)
            <a href="/{{ $class['slug'] }}"
               class="flex min-w-0 items-center gap-3 rounded border border-neutral-700 bg-black/40 p-3 transition-colors hover:border-[#6b5a2e]">
                <img src="{{ $class['icon'] }}" alt="{{ $class['name'] }}" width="48" height="48"
                     class="h-12 w-12 shrink-0 rounded" loading="lazy" onerror="this.remove()">
                <span class="flex min-w-0 flex-col">
                    <span class="truncate font-semibold" style="color:#ffd100">{{ $class['name'] }}</span>
                    <span class="truncate text-xs text-neutral-400">Open calculator</span>
                </span>
            </a>
        @endforeach
    </div>
</section>

<section class="mt-10 grid gap-4 md:grid-cols-3">
    <article class="rounded border border-neutral-700 bg-black/30 p-4">
        <h2 class="font-bold" style="color:#ffd100">Talent calculator</h2>
        <p class="mt-2 text-sm text-neutral-300">
            Classic row gates, prerequisites, a shared 51-point pool and a
            level selector. Share a build with the URL.
        </p>
    </article>
    <article class="rounded border border-neutral-700 bg-black/30 p-4">
        <h2 class="font-bold" style="color:#ffd100">Raid Comp</h2>
        <p class="mt-2 text-sm text-neutral-300">
            Build a party or raid and see which buffs and debuffs the group
            provides, plus conflicts and gaps.
        </p>
        <p class="mt-2 text-xs text-neutral-400">In development.</p>
    </article>
    <article class="rounded border border-neutral-700 bg-black/30 p-4">
        <h2 class="font-bold" style="color:#ffd100">BiS Lists</h2>
        <p class="mt-2 text-sm text-neutral-300">
            Per class, spec and phase, with item sources and alternatives.
            Every row will show where it came from.
        </p>
        <p class="mt-2 text-xs text-neutral-400">In development.</p>
    </article>
</section>

<section class="mt-10 rounded border border-neutral-800 bg-black/20 p-4 text-sm text-neutral-400">
    <p>
        Data comes from wowtbc.gg, Wowhead Forever and the community wiki. See
        <a href="/sources" class="underline hover:text-white">Sources</a> for the
        full list and the attribution.
    </p>
</section>
@endsection
