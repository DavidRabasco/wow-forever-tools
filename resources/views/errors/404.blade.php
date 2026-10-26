@extends('layouts.site')

@section('content')
<div class="mx-auto max-w-2xl py-16 text-center">
    <p class="text-xs uppercase tracking-[0.3em] text-neutral-400">404</p>
    <h1 class="mt-2 text-3xl font-bold" style="color:#ffd100">Page not found</h1>
    <p class="mt-4 text-neutral-300">
        That page does not exist. Try the home page or open a class calculator.
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/" class="rounded border-2 border-[#6b5a2e] px-4 py-2 text-sm font-semibold hover:bg-black/40" style="color:#ffd100">Home</a>
        <a href="/druid" class="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white">Talent calculator</a>
    </div>
</div>
@endsection
