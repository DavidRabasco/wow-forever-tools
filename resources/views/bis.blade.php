@extends('layouts.site')

@section('content')
<div class="mx-auto max-w-2xl py-12 text-center">
    <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">In development</p>
    <h1 class="mt-2 text-3xl font-bold" style="color:#ffd100">BiS Lists</h1>
    <p class="mt-4 text-neutral-300">
        Best-in-slot lists are in development. Each spec page will show items by
        slot, where they drop, alternatives, and a source for every row.
    </p>
    <p class="mt-3 text-sm text-neutral-400">
        Holy Paladin and Fury Warrior will be the first two pilots.
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/" class="rounded border-2 border-[#6b5a2e] px-4 py-2 text-sm font-semibold hover:bg-black/40" style="color:#ffd100">Back home</a>
        <a href="/druid" class="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white">Open the calculator</a>
    </div>
</div>
@endsection
