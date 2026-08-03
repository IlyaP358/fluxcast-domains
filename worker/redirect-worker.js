/**
 * fluxcast.dev edge worker.
 *
 * Serves three things:
 *   1. sub.fluxcast.dev            -> the subdomain registration page
 *   2. any domain with a URL record -> an HTTP redirect to its target
 *   3. everything else              -> passed through untouched
 *
 * The redirect table is read live from the public registry API, so a merged
 * pull request goes live on its own. Nothing here needs redeploying when a
 * domain is added, changed or removed.
 *
 * Deployed by hand via the Cloudflare dashboard. Requires two bindings:
 * the custom domain sub.fluxcast.dev, and the route *.fluxcast.dev/*
 * (zone fluxcast.dev). See README.md in this directory.
 */

const V2_URL = "https://raw.fluxcast.dev/v2.json";
const SUB_PAGE_URL = "https://fluxcast.dev/subdomains.html";
const ROOT_DOMAIN = "fluxcast.dev";

const MAP_TTL_MS = 60_000;
const EDGE_CACHE_SECONDS = 60;
const REDIRECT_CACHE_SECONDS = 300;

// Served for sub.fluxcast.dev so it is indexed as its own site. Cloudflare
// prepends its managed content signals block to the robots.txt response.
const SUB_ROBOTS = `User-agent: *
Allow: /

Sitemap: https://sub.${ROOT_DOMAIN}/sitemap.xml
`;

const SUB_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://sub.${ROOT_DOMAIN}/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>
`;

let cache = { fetchedAt: 0, map: null };

function buildMap(entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;

  for (const entry of entries) {
    if (!entry || entry.reserved || entry.internal) continue;
    const target = entry.records && entry.records.URL;
    if (typeof target !== "string" || target === "") continue;
    if (typeof entry.domain !== "string") continue;

    map.set(entry.domain.toLowerCase(), {
      target,
      config: entry.redirect_config || null,
    });
  }
  return map;
}

async function getMap() {
  const now = Date.now();
  if (cache.map && now - cache.fetchedAt < MAP_TTL_MS) return cache.map;

  try {
    const res = await fetch(V2_URL, {
      cf: { cacheTtl: EDGE_CACHE_SECONDS, cacheEverything: true },
      headers: { "user-agent": "fluxcast-redirect-worker" },
    });
    if (!res.ok) throw new Error(`registry returned ${res.status}`);

    const map = buildMap(await res.json());
    cache = { fetchedAt: now, map };
    return map;
  } catch (err) {
    // Serve the last known table rather than breaking live redirects.
    if (cache.map) return cache.map;
    throw err;
  }
}

function trimTrailingSlash(pathname) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function appendPath(target, suffix) {
  if (!suffix || suffix === "/") return target;
  return target.replace(/\/+$/, "") + suffix;
}

function appendSearch(target, search) {
  if (!search || search === "?") return target;
  return target + (target.includes("?") ? "&" : "?") + search.slice(1);
}

function resolveTarget(entry, url) {
  const config = entry.config || {};
  const exactPath = trimTrailingSlash(url.pathname);

  if (config.custom_paths) {
    const hit = config.custom_paths[exactPath] ?? config.custom_paths[url.pathname];
    if (typeof hit === "string") return appendSearch(hit, url.search);
  }

  if (config.redirect_paths) {
    return appendSearch(appendPath(entry.target, url.pathname), url.search);
  }

  return appendSearch(entry.target, url.search);
}

function textResponse(body, contentType) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  });
}

async function serveSub(url) {
  if (url.pathname === "/robots.txt") {
    return textResponse(SUB_ROBOTS, "text/plain; charset=utf-8");
  }
  if (url.pathname === "/sitemap.xml") {
    return textResponse(SUB_SITEMAP, "application/xml; charset=utf-8");
  }

  const upstream = await fetch(SUB_PAGE_URL, {
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  const headers = new Headers(upstream.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (host === `sub.${ROOT_DOMAIN}`) return serveSub(url);

    let map;
    try {
      map = await getMap();
    } catch {
      return fetch(request);
    }

    const entry = map.get(host);
    if (!entry) return fetch(request);

    return new Response(null, {
      status: entry.config && entry.config.permanent ? 301 : 302,
      headers: {
        location: resolveTarget(entry, url),
        "cache-control": `public, max-age=${REDIRECT_CACHE_SECONDS}`,
        "referrer-policy": "no-referrer-when-downgrade",
        "x-fluxcast-redirect": "registry",
      },
    });
  },
};
