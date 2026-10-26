@extends('layouts.site')

@section('content')
<div class="mx-auto max-w-3xl">
    <h1 class="text-3xl font-bold" style="color:#ffd100">About</h1>
    <p class="mt-4 text-neutral-300">
        WoW Forever Tools is an unofficial fan project for the WoW Forever
        community. It started as a talent calculator and is growing into a small
        set of planning tools: talent builds, raid composition and BiS lists.
    </p>
    <p class="mt-3 text-neutral-300">
        The project is built and maintained by David. The production site is a
        static export, so builds never leave your browser: they are encoded in
        the URL.
    </p>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Data and accuracy</h2>
    <p class="mt-3 text-neutral-300">
        Gameplay data is curated from public sources and marked as verified or
        unverified. If you find a wrong talent, buff or item, the goal is to fix
        it with a source, not to guess. The full source list is on the
        <a href="/sources" class="underline hover:text-white">Sources</a> page.
    </p>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Independence</h2>
    <p class="mt-3 text-neutral-300">
        This site is not affiliated with or endorsed by Blizzard Entertainment.
        World of Warcraft and related marks belong to Blizzard. Icons and
        artwork belong to their respective owners and are used for educational
        fan content with attribution.
    </p>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Contact</h2>
    <p class="mt-3 text-neutral-300">
        Data corrections, copyright requests and general questions:
        <a href="mailto:contact@wowforevertools.com" class="underline hover:text-white">contact@wowforevertools.com</a>.
        The address is provisional until the site has its own domain.
    </p>
</div>
@endsection
