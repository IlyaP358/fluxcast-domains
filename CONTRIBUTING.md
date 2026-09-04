# Registering a `*.fluxcast.dev` subdomain

You get a free `yourname.fluxcast.dev` subdomain by opening a pull request that
adds **one JSON file**. No account, no dashboard, no cost.

## Steps

1. **Fork** this repository.
2. Create `domains/<your-subdomain>.json`. The file name (without `.json`) is
   your subdomain: `domains/coolproject.json` → `coolproject.fluxcast.dev`.
3. Fill it in (see below), commit, and open a pull request.
4. Automated checks run on your PR. If they fail, read the error, fix it, and
   push again — the checks re-run automatically.
5. A maintainer reviews and merges. Your DNS goes live within a few minutes.

## File format

```json
{
    "owner": {
        "username": "your-github-username",
        "email": "you@example.com"
    },
    "records": {
        "CNAME": "your-github-username.github.io"
    }
}
```

- `owner.username` **must** match your GitHub username (case-insensitive). This
  is how ownership is enforced: you can only add, edit, or delete your own files.
- `owner.email` is **optional**. ⚠️ Anything in this file is committed to a
  **public** repository, so an email here is publicly visible in git. It is
  stripped from the public raw API, but not from git history — omit it or use a
  throwaway if you care.
- `records` holds your DNS records (at least one).

## Naming rules

- **Lowercase only**, ASCII letters, digits and hyphens.
- **No consecutive hyphens** (`--`).
- Root subdomains **can't start with** `_`.
- **Reserved / internal** names are off-limits (see
  [`util/reserved.json`](util/reserved.json) and
  [`util/internal.json`](util/internal.json)).
- **One** single-character subdomain (e.g. `x.fluxcast.dev`) per user.

## Supported records

| Type    | Shape                                                              |
| ------- | ----------------------------------------------------------------- |
| `A`     | `["1.2.3.4"]`, array of **public** IPv4                            |
| `AAAA`  | `["2606:..."]`, array of **public** IPv6                          |
| `CNAME` | `"target.example.com"`, a single hostname (alone, unless proxied) |
| `MX`    | `[{"target": "mx.example.com", "priority": 10}]`                  |
| `NS`    | `["ns1.example.com"]`, delegate DNS for the subdomain             |
| `TXT`   | `"value"` or `["v1", "v2"]`                                       |
| `URL`   | `"https://example.com"`, HTTP redirect (proxied)                 |
| `CAA` / `SRV` / `DS` / `TLSA` | advanced records, see examples in `domains/` |

### Record rules

- `A` / `AAAA` must be **public** IPs — private/local ranges (`10.x`,
  `192.168.x`, `127.x`, `169.254.x`, etc.) are rejected.
- `CNAME` must be the **only** record, unless the domain is proxied.
- `NS` may only be combined with `DS`; `URL` can't be combined with
  `A`/`AAAA`/`CNAME`.
- `CNAME` can't point to Cloudflare tunnels or workers
  (`*.workers.dev`, `*.trycloudflare.com`, `*.cfargotunnel.com`).
- **No wildcards** — `*.yourname.fluxcast.dev` is not supported.

## Options

- `"proxied": true` routes through Cloudflare (free SSL, DDoS protection, hides
  your origin IP). Requires an `A`, `AAAA`, or `CNAME` record.
- `"redirect_config"` tunes how a `URL` redirect behaves (see below).

### Redirect options

A plain `URL` record redirects to your target and keeps the query string, but
drops the path. Add `redirect_config` to change that:

```json
{
    "owner": { "username": "your-github-username" },
    "records": { "URL": "https://example.com" },
    "redirect_config": {
        "redirect_paths": true,
        "custom_paths": { "/docs": "https://docs.example.com" },
        "permanent": false
    }
}
```

| Option | Effect |
| ------ | ------ |
| `redirect_paths` | Forwards the request path, so `/blog` lands on `target/blog`. |
| `custom_paths` | Sends specific paths to their own targets. Takes priority over `redirect_paths`. |
| `permanent` | Uses a `301` instead of the default `302`. |

Redirects use `302` by default so you can change your target later and have it
take effect within minutes. Only set `"permanent": true` when your target is
final, since browsers cache `301`s aggressively.

## HTTPS

You get HTTPS automatically: via Cloudflare when `proxied`, or from your host
(e.g. GitHub Pages, Netlify, Vercel) when it isn't.

## Nested subdomains

`blog.coolproject.fluxcast.dev` → `domains/blog.coolproject.json`. The parent
(`coolproject.json`) must already exist and be owned by you.

## Managing your subdomain

- **Update:** edit your JSON file and open a PR.
- **Delete:** remove your JSON file and open a PR.
- **Transfer** to another user: open an issue — a maintainer handles ownership
  changes.

## What's allowed

**Any lawful website** — a personal page, portfolio, project, blog, docs, demo,
or commercial site. We don't gate on topic, "completeness", or commercial use.
Build what you want.

## What's NOT allowed

- Phishing, scams, impersonation, or brand-squatting.
- Malware, spyware, or command-and-control infrastructure.
- Illegal content or activity under applicable law.
- Spam, link farms, or SEO manipulation.
- Harassment, threats, or content that endangers others.
- Sexual content involving minors (reported to authorities immediately).
- Using the subdomain to relay or anonymize abuse.

Breaking these gets the subdomain removed and may get you blocked. See the
[Terms of Service](TERMS_OF_SERVICE.md).

## Pacing (anti-flood)

No more than **10 new subdomain PRs per person within any 14-day window**.
1, 3, even 10 at once is completely normal, no questions asked. If you're
opening dozens in a single sitting, that's a flood, not a project, and PRs
past the limit will be paused until things space out. This isn't a lifetime
cap on how many subdomains you can end up with, just a "not all at once" rule
so review stays fair and manageable for everyone.

CI checks this automatically and will fail with a clear message if you're
over the limit.

## Test locally before opening a PR

```bash
pip install -e ".[dev]"
pytest -q
```

## FAQ

- **How long until it's live?** A few minutes / hours after your PR is merged.
- **Is my email public?** Yes, if you include it — the file lives in a public
  repo. It's stripped from the raw API only. Omit it or use a throwaway.
- **Do I get HTTPS?** Yes (see above).
- **Can I get a wildcard (`*.name`)?** No.
- **How many subdomains can I have?** No lifetime limit, but no more than 10
  new PRs in any 14-day window (see [Pacing](#pacing-anti-flood)).
- **Can I point to GitHub Pages / Netlify / Vercel?** Yes, with a `CNAME`.
- **Can I run my own nameservers?** Yes, with `NS` records (delegation).
- **Lost access, or need to transfer ownership?** Open an issue.
