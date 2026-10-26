@extends('layouts.site')

@section('content')
<div class="mx-auto max-w-2xl py-12 text-center">
    <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">In development</p>
    <h1 class="mt-2 text-3xl font-bold" style="color:#ffd100">Raid Comp</h1>
    <p class="mt-4 text-neutral-300">
        This tool is in development. It will let you add classes and specs to a
        party or raid and see the buffs and debuffs the group provides, plus
        conflicts, duplicates and gaps.
    </p>
    <p class="mt-3 text-sm text-neutral-400">
        It needs verified buff and debuff data first, so it ships after the
        talent refresh.
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/" class="rounded border-2 border-[#6b5a2e] px-4 py-2 text-sm font-semibold hover:bg-black/40" style="color:#ffd100">Back home</a>
        <a href="/druid" class="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white">Open the calculator</a>
    </div>
</div>
@endsection
