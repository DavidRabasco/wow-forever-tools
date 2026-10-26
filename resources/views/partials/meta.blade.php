@php
    $siteUrl = rtrim(config('forever.site_url') ?? '', '/');
    $pageTitle = $title ?? 'WoW Forever Tools';
    $pageDescription = $description ?? 'Talent calculators, raid composition and BiS lists for WoW Forever.';
    $pageCanonical = $canonical ?? null;
    $pageRobots = $robots ?? null;
    $pageOgType = $ogType ?? 'website';
    $pageOgImage = $ogImage ?? null;
@endphp
<link rel="preconnect" href="https://wow.zamimg.com" crossorigin>
<link rel="preconnect" href="https://sunderarmor.com" crossorigin>
<title>{{ $pageTitle }}</title>
<meta name="description" content="{{ $pageDescription }}">
@if($pageRobots)
<meta name="robots" content="{{ $pageRobots }}">
@endif
@if($pageCanonical)
<link rel="canonical" href="{{ $pageCanonical }}">
@endif
<meta property="og:type" content="{{ $pageOgType }}">
<meta property="og:site_name" content="WoW Forever Tools">
<meta property="og:title" content="{{ $pageTitle }}">
<meta property="og:description" content="{{ $pageDescription }}">
@if($pageCanonical)
<meta property="og:url" content="{{ $pageCanonical }}">
@endif
@if($pageOgImage)
<meta property="og:image" content="{{ $pageOgImage }}">
@endif
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{{ $pageTitle }}">
<meta name="twitter:description" content="{{ $pageDescription }}">
