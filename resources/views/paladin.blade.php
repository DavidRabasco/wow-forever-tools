<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paladin - WoW Forever</title>
    @vite(['resources/css/app.css', 'resources/js/paladin.js'])
</head>
<body class="bg-neutral-900 text-white p-4">
<h1 class="text-2xl font-bold text-center">Paladin - Forever Calculator</h1>
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
