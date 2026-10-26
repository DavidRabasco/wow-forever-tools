@extends('layouts.site')

@section('content')
<div class="mx-auto max-w-3xl">
    <h1 class="text-3xl font-bold" style="color:#ffd100">Sources</h1>
    <p class="mt-4 text-neutral-300">
        Every gameplay fact should point to a source. The site prefers facts
        (names, ids, ranks, numbers) and links to the original page instead of
        copying long descriptions.
    </p>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Talent data</h2>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-neutral-300">
        <li>
            <a href="https://wowtbc.gg/" class="underline hover:text-white" rel="nofollow noopener" target="_blank">wowtbc.gg</a>:
            page-data JSON used by the importer for names, rows, columns, ranks
            and skill text.
        </li>
        <li>
            Wowhead Forever talent calculator: cross-check for changed, moved or
            new talents.
        </li>
        <li>
            Warcraft Wiki: cross-check for mechanics, prerequisites and tooltip
            wording.
        </li>
    </ul>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Icons and artwork</h2>
    <ul class="mt-3 list-disc space-y-2 pl-5 text-neutral-300">
        <li>Icons: Blizzard, served from <code>wow.zamimg.com</code> by short name.</li>
        <li>Tree artwork: hotlinked for educational fan use, with a dark fallback.</li>
        <li>Class portraits and site logo: hotlinked from sunderarmor.</li>
    </ul>

    <h2 class="mt-8 text-xl font-bold" style="color:#ffd100">Status</h2>
    <p class="mt-3 text-neutral-300">
        The talent catalog was last checked on 2026-10-26. BiS, buffs and debuffs
        are still being curated; rows without two sources stay marked as
        unverified.
    </p>

    <p class="mt-8 rounded border border-neutral-800 bg-black/20 p-4 text-sm text-neutral-400">
        Data and marks belong to Blizzard Entertainment and the cited
        community sites. This project claims no ownership over them.
    </p>
</div>
@endsection
