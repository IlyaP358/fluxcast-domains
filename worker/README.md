# fluxcast edge worker

Cloudflare has no `URL` record type, so the sync publishes a proxied placeholder
`A` record (`192.0.2.1`) for those domains. This worker turns that placeholder
into a real redirect, and serves `sub.fluxcast.dev`.

It reads the redirect table live from `https://raw.fluxcast.dev/v2.json`, which
is regenerated on every merge, so **a new `URL` domain works on its own**. Only
a change to `redirect-worker.js` needs a deploy.

Redirect options (`redirect_paths`, `custom_paths`, `permanent`) are documented
for contributors in [CONTRIBUTING.md](../CONTRIBUTING.md#redirect-options).

## Deploy

1. Cloudflare → **Workers & Pages** → open the worker serving
   `sub.fluxcast.dev` → **Edit code**.
2. Paste `redirect-worker.js`, then **Deploy**.
3. **Settings → Domains & Routes** must include the route `*.fluxcast.dev/*`
   (zone `fluxcast.dev`) alongside the existing `sub.fluxcast.dev` domain.

## Verify

```bash
curl -sI https://demo.fluxcast.dev | grep -iE '^HTTP|^location'   # redirect
curl -s -o /dev/null -w '%{http_code}\n' https://sub.fluxcast.dev  # 200
curl -s https://sub.fluxcast.dev/robots.txt | tail -3              # sitemap line
curl -s -o /dev/null -w '%{http_code}\n' https://rahulshahx.fluxcast.dev  # 200
```

The last one matters most: it confirms the worker passes non-`URL` domains
through untouched.
