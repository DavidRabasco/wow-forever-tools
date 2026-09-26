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
{{-- Trees on the left, pick-order panel on the right. The JS owns #trees
     content and #pick-order rows; this skeleton only holds their slots. --}}
<div class="flex flex-wrap justify-center items-start gap-8 mt-4">
<div id="trees">Loading...</div>
<aside id="pick-panel" class="w-max max-w-full shrink-0 rounded border border-neutral-700 bg-black/40 p-3 lg:sticky lg:top-4">
<h2 class="text-lg font-bold" style="color:#ffd100">Pick Order</h2>
<div id="pick-level" class="text-sm text-neutral-300 mb-2">Level 9</div>
{{-- Single column with internal scroll; rows stay on one line (see renderPickOrder). --}}
<ol id="pick-order" class="max-h-[70vh] overflow-y-auto"></ol>
</aside>
</div>
</body>
</html>
