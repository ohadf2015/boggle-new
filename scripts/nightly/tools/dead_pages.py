#!/usr/bin/env python3
"""Dead-page finder for the nightly AdSense lane (lane-08).

WHY: lane-08's noindex step needs the INVERSE of an SEO report — not "pages that
rank" but "indexed pages that get ~0 traffic". The seo-daily report is
query-centric (only lists pages WITH traffic), so a zero-traffic dead page is
invisible to it. This tool pulls GSC page-dimension data directly and surfaces
the dead programmatic pages that are SAFE to noindex (an allowlist of thin
programmatic families), explicitly EXCLUDING lane-08's game-page hard-ban list
(e.g. /anagram/* — those are a separate founder decision).

Pure core `select_dead_pages()` is unit-tested (dead_pages.test.py, no deps).
The CLI pulls live GSC via the same ADC lane-06 uses and prints a markdown table
lane-08 reads in its Step 2.

Usage:
  python3 scripts/nightly/tools/dead_pages.py            # markdown table to stdout
  python3 scripts/nightly/tools/dead_pages.py --json     # raw JSON
"""
from __future__ import annotations

import sys
from typing import Iterable

LOCALES = ("en", "he", "sv", "ja", "es")

# Thin programmatic families SAFE to noindex (NOT game pages, low/no user value).
ALLOW_PREFIXES = ["/words/starting-with/"] + [f"/words/{n}-letter-words" for n in range(2, 10)]

# Mirror of lane-08 guardrail #1 game-page hard-ban (canonical, locale-stripped).
# Anything here is NEVER auto-noindexed even if dead — including /anagram, whose
# 76 dead pages are a deliberate-SEO-bet reversal only the founder should make.
BAN_PREFIXES = [
    "/multiplayer", "/daily", "/blast", "/adventure", "/brain", "/practice",
    "/party", "/community", "/quests", "/student", "/teacher",
    "/education/duels", "/education/classroom-game", "/connections/play",
    "/anagram", "/join", "/challenge", "/friend-challenge", "/profile",
    "/settings", "/friends", "/custom", "/word-of-the-day",
]

SITE = "sc-domain:lexiclash.live"
DAYS = 28
MAX_IMPRESSIONS = 2
CAP = 5


def _canonical_path(page: str) -> str:
    """Strip scheme+host and a leading /<locale> segment → canonical path."""
    path = page
    if "://" in path:
        path = "/" + path.split("://", 1)[1].split("/", 1)[1] if "/" in path.split("://", 1)[1] else "/"
    # drop leading /<locale>
    parts = path.split("/", 2)  # ['', '<locale-or-seg>', 'rest...']
    if len(parts) >= 2 and parts[1] in LOCALES:
        path = "/" + (parts[2] if len(parts) > 2 else "")
    return path.rstrip("/") or "/"


def _matches_any(path: str, prefixes: Iterable[str]) -> bool:
    """True if `path` equals a prefix (leaf, e.g. /words/3-letter-words) or is a
    child of it (e.g. /anagram → /anagram/abcr). Boundary-aware: /daily never
    matches /dailything."""
    p = path.rstrip("/")
    for pre in prefixes:
        pre = pre.rstrip("/")
        if p == pre or p.startswith(pre + "/"):
            return True
    return False


def _locale_of(page: str) -> str | None:
    """The /<locale> segment of a page URL, or None if absent."""
    path = page
    if "://" in path:
        rest = path.split("://", 1)[1]
        path = "/" + (rest.split("/", 1)[1] if "/" in rest else "")
    parts = path.split("/", 2)
    return parts[1] if len(parts) >= 2 and parts[1] in LOCALES else None


def select_dead_pages(rows, allow_prefixes, ban_prefixes,
                      max_impressions: int = MAX_IMPRESSIONS, cap: int = CAP,
                      require_locale: str | None = None):
    """Pick up to `cap` noindex candidates from GSC page rows.

    A candidate has clicks == 0 AND impressions <= max_impressions, its canonical
    path matches an allow prefix, matches NO ban prefix, and — when
    `require_locale` is set — lives under that locale. Sorted by impressions asc,
    then page url. Ban is checked first (wins ties/overlap).

    `require_locale` exists because the allowed `/words/*` families are
    EN-only-indexed (`robots: { index: locale === 'en' }`): a non-en page is
    ALREADY noindexed, so surfacing it would waste the lane's 5/night cap on a
    no-op.
    """
    out = []
    for r in rows:
        page = r["page"]
        clicks = int(r.get("clicks", 0))
        impr = int(r.get("impressions", 0))
        if clicks != 0 or impr > max_impressions:
            continue
        if require_locale is not None and _locale_of(page) != require_locale:
            continue
        path = _canonical_path(page)
        if _matches_any(path, ban_prefixes):
            continue
        if not _matches_any(path, allow_prefixes):
            continue
        out.append({"page": page, "clicks": clicks, "impressions": impr})
    out.sort(key=lambda c: (c["impressions"], c["page"]))
    return out[:cap]


def _pull_gsc_pages():
    import datetime
    import google.auth
    import googleapiclient.discovery as disc
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    gsc = disc.build("searchconsole", "v1", credentials=creds)
    end = datetime.date.today()
    start = end - datetime.timedelta(days=DAYS)
    resp = gsc.searchanalytics().query(siteUrl=SITE, body={
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "dimensions": ["page"], "rowLimit": 1000,
    }).execute()
    return [{"page": r["keys"][0], "clicks": r["clicks"], "impressions": r["impressions"]}
            for r in resp.get("rows", [])]


def main(argv):
    try:
        rows = _pull_gsc_pages()
    except Exception as e:  # ADC missing / 403 / network → degrade, never crash the lane
        print(f"<!-- dead-pages: GSC unavailable ({e}); skip noindex this run -->")
        return 0
    # /words/* families are EN-only-indexed → only an /en page can be a real
    # noindex target (non-en is already index:false).
    cands = select_dead_pages(rows, ALLOW_PREFIXES, BAN_PREFIXES, require_locale="en")
    if "--json" in argv:
        import json
        print(json.dumps(cands, indent=2))
        return 0
    print(f"## Dead-page noindex candidates ({DAYS}d, 0 clicks & <= {MAX_IMPRESSIONS} impr, non-banned)")
    print(f"_Scanned {len(rows)} indexed pages. Cap {CAP}/night. /anagram excluded (founder decision)._\n")
    if not cands:
        print("None — no non-banned thin programmatic page is dead this run. No-op is correct.")
        return 0
    print("| Page | clicks | impr |")
    print("|------|--------|------|")
    for c in cands:
        print(f"| {c['page']} | {c['clicks']} | {c['impressions']} |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
