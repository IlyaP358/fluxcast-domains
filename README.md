<p align="center">
   <img src="https://fluxcast.secweb.cloud/flcast_logo_512x512.png" width="150" alt="fluxcast logo">
</p>

<h1 align="center">fluxcast.dev subdomains</h1>

<p align="center">
   Free <code>yourname.fluxcast.dev</code> subdomains for developers.
   GitOps DNS driven by pull requests, powered by Python + Cloudflare.
</p>

<p align="center">
   <img alt="Domains" src="https://img.shields.io/github/directory-file-count/IlyaP358/fluxcast-domains/domains?color=2e8b57&label=domains&style=for-the-badge">
   <img alt="Pull Requests" src="https://img.shields.io/github/issues-pr-raw/IlyaP358/fluxcast-domains?color=2e8b57&label=pull%20requests&style=for-the-badge">
   <img alt="Issues" src="https://img.shields.io/github/issues-raw/IlyaP358/fluxcast-domains?color=2e8b57&label=issues&style=for-the-badge">
   <img alt="Stars" src="https://img.shields.io/github/stars/IlyaP358/fluxcast-domains?color=2e8b57&style=for-the-badge">
</p>

---

This is a sister project of [**fluxcast**](https://github.com/IlyaP358/fluxcast),
which streams your Linux desktop to a TV via Miracast/WFD, DLNA, or Chromecast. To
give back to the community, we hand out free subdomains the same way
[is-a.dev](https://github.com/is-a-dev/register) does, but the whole
infrastructure here is **pure Python**.

## Get a subdomain

1. [Fork](../../fork) this repo.
2. Add one file: `domains/<your-subdomain>.json`.
3. Open a pull request.
4. Pass the automated checks, get reviewed, and your DNS goes live within
   minutes.

Full guide → [CONTRIBUTING.md](CONTRIBUTING.md). Info page →
[sub.fluxcast.dev](https://sub.fluxcast.dev).

```json
{
    "owner": { "username": "your-github-username", "email": "you@example.com" },
    "records": { "CNAME": "your-github-username.github.io" }
}
```

## How it works

```
domains/*.json  ──►  pytest validation (CI on every PR)
     │                    └─ names, records, private-IP filter, ownership, nesting
     │
   merge to main
     │
     ├──►  fluxcast-sync   → reconciles records into Cloudflare (publish.yml)
     └──►  fluxcast-raw-api → publishes raw-api/v2.json to raw.fluxcast.dev
```

- **One JSON file = one subdomain.** The `domains/` directory *is* the database.
- **Validation** lives in [`src/fluxcast_domains/validation.py`](src/fluxcast_domains/validation.py)
  and is shared by the test suite and the sync, so nothing invalid can be published.
- **The sync is apex-safe.** Every record it creates is tagged
  `managed-by:fluxcast-domains`; it only ever touches its own records, so the
  `fluxcast.dev` landing page and any hand-made record are never at risk.
- **`URL` records redirect automatically.** Cloudflare has no `URL` record type,
  so an [edge worker](worker/) reads the published registry and serves the
  redirect. New redirects go live with the merge, nothing to configure.

## Local development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

pytest -q                 # run the full validation suite
fluxcast-sync --dry-run   # preview DNS changes (needs Cloudflare env to apply)
fluxcast-raw-api          # regenerate raw-api/v2.json
```

Publishing (in CI) needs two secrets:

| Secret                 | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | scoped token: Zone → DNS → Edit (this zone) |
| `CLOUDFLARE_ZONE_ID`   | the `fluxcast.dev` zone id                  |

## Project layout

| Path                        | What                                             |
| --------------------------- | ------------------------------------------------ |
| `domains/`                  | one JSON per subdomain (the registry)            |
| `util/`                     | reserved / internal / trusted / disallowed lists |
| `src/fluxcast_domains/`     | loader, models, validation, records, sync, raw API |
| `tests/`                    | pytest validation suite                          |
| `.github/workflows/`        | CI, publish, raw-api, stale                      |

## Reporting abuse

Found a `*.fluxcast.dev` subdomain being misused? Open a
[report-abuse issue](../../issues/new?labels=report-abuse&template=report-abuse.md).
See the [Terms of Service](TERMS_OF_SERVICE.md).

## Support the project

This service is free and runs on volunteer time. If it is useful to you:

- ⭐ **Star this repo** — it genuinely helps more developers find the service.
- ☕ **[Buy me a coffee on Ko-fi](https://ko-fi.com/fluxcast)** =] — covers the domain and keeps the lights on.

Every star and coffee is appreciated. Thank you!

## License

[GPL-3.0](LICENSE)
