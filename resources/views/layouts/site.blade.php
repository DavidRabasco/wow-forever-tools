<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    @include('partials.meta', [
        'title' => $title ?? 'WoW Forever Tools',
        'description' => $description ?? 'Talent calculators, raid composition and BiS lists for WoW Forever.',
        'canonical' => $canonical ?? null,
        'robots' => $robots ?? null,
        'ogType' => $ogType ?? 'website',
    ])
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @vite(['resources/css/app.css'])
</head>
<body class="flex min-h-screen flex-col bg-neutral-900 text-white">
    @include('partials.navbar', ['current' => $current ?? ''])
    <main class="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8">
        @yield('content')
    </main>
    @include('partials.footer')
    @include('partials.analytics')
</body>
</html>
