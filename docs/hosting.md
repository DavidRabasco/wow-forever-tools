# Hosting

Status: draft, pending owner decision.

## Requirements

- Static output only: HTML, JSON, the Vite bundle and small text files.
- A custom domain for credibility, search and ad approval.
- Clean URLs and compatibility for the existing `{class}.html` links.
- Security headers, at least `X-Content-Type-Options` and a referrer policy.
- Free tier at launch.
- No deployment secret if possible.

## Option A: GitHub Pages (current)

- Already configured in `.github/workflows/pages.yml`.
- No deployment secrets: the workflow uses `GITHUB_TOKEN` and the Pages
  environment.
- Custom domain is supported.
- No server-side redirects or custom response headers. Clean URLs work through
  directories and `index.html`, but old paths need meta-refresh stubs.
- Analytics must come from another provider.
- Good fit if the priority is zero secrets and minimal moving parts.

## Option B: Cloudflare Pages

- Free tier for static sites.
- Custom domain and automatic TLS.
- `_headers` and `_redirects` files in the output, so the `{class}.html` to
  `{class}/` migration can use real redirects.
- Cloudflare Web Analytics is cookieless and can be enabled without a script
  banner.
- Deploy from the GitHub repository or from GitHub Actions with
  `cloudflare/wrangler-action`, which needs a Cloudflare API token stored as a
  repository secret.
- Better fit if the site will use ads, many redirects and a custom domain.

## Recommendation

Use **Cloudflare Pages** when a custom domain and ads become part of the launch.
Keep the exporter host-agnostic and keep GitHub Pages working until the domain is
ready. If adding a Cloudflare token is not acceptable, stay on GitHub Pages and
use meta-refresh stubs for the old URLs.

## Migration checklist

1. Buy the domain.
2. Create the Pages project and connect the repository.
3. Set the build command `npm run build && php artisan forever:export dist` and
   the output directory `dist`.
4. Add `_headers` and `_redirects` to the exporter output.
5. Point DNS at the Pages project.
6. Verify HTTPS, `/paladin/`, `/paladin.html`, `/404.html`, `sitemap.xml` and
   `robots.txt`.
7. Submit the domain to Search Console and update the sitemap.
8. Keep GitHub Pages as a fallback until the first successful crawl.

## Open decision

- GitHub Pages or Cloudflare Pages?
- Domain name and registrar?
- Is a Cloudflare API token acceptable as a repository secret?
