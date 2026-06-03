#!/usr/bin/env python3
# reddit-rss-parse.py — parse Reddit Atom RSS (a subreddit feed *.rss or search.rss)
# into the SAME compact JSON shape reddit-fetch.sh's _parse emits:
#   {title, score, num_comments, permalink, author, subreddit, created_utc, selftext}
#
# WHY: Reddit's unauthenticated JSON API returns HTTP 403 (verified 2026-06-03,
# 189 KB block page), but the RSS endpoints still return HTTP 200 to a browser UA
# from a residential IP — a DIFFERENT gate. RSS is the only fully-autonomous Reddit
# signal that needs no OAuth app. RSS omits score/num_comments, so those are null
# (honest "unknown"); titles/permalinks/authors/timestamps/body are real — the
# signal lanes actually use (what are people saying about word games on Reddit).
#
# stdin = the Atom XML.  argv[1] = max items (default 25).
# Output: compact JSON array on stdout (always valid JSON; "[]" on parse failure).
import sys, json, re, html
from datetime import datetime

# XXE / billion-laughs hardening: prefer defusedxml; else use stdlib but reject any
# DOCTYPE/ENTITY (Reddit RSS never contains these) and cap input size. Both attacks
# require a DOCTYPE, so rejecting it neutralises them without a hard dependency.
try:
    from defusedxml.ElementTree import fromstring as _xml_fromstring  # type: ignore
    _DEFUSED = True
except Exception:  # pragma: no cover - defusedxml not installed
    from xml.etree.ElementTree import fromstring as _xml_fromstring
    _DEFUSED = False

MAX_BYTES = 8 * 1024 * 1024  # 8 MB ceiling — real feeds are ~10-30 KB
ATOM = "{http://www.w3.org/2005/Atom}"


def safe_parse(raw):
    if len(raw) > MAX_BYTES:
        return None
    if not _DEFUSED and re.search(r"<!\s*(DOCTYPE|ENTITY)", raw, re.IGNORECASE):
        return None  # entity-expansion vector — Reddit RSS never has these
    try:
        return _xml_fromstring(raw)
    except Exception:
        return None


def to_epoch(s):
    if not s:
        return None
    s = s.strip().replace("Z", "+00:00")
    try:
        return int(datetime.fromisoformat(s).timestamp())
    except Exception:
        return None


def strip_html(s):
    if not s:
        return ""
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()[:500]


def sub_from_link(link):
    m = re.search(r"/r/([A-Za-z0-9_]+)/", link or "")
    return m.group(1) if m else ""


def main():
    limit = 25
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])
    raw = sys.stdin.read()
    root = safe_parse(raw)
    if root is None:
        print("[]")
        return

    feed_sub = ""
    cat = root.find(f"{ATOM}category")
    if cat is not None:
        feed_sub = (cat.get("term") or "")

    out = []
    for e in root.findall(f"{ATOM}entry"):
        title = (e.findtext(f"{ATOM}title") or "").strip()
        link_el = e.find(f"{ATOM}link")
        permalink = (link_el.get("href") if link_el is not None else "") or ""
        author = ""
        auth = e.find(f"{ATOM}author")
        if auth is not None:
            author = re.sub(r"^/u/", "", (auth.findtext(f"{ATOM}name") or "").strip())
        published = e.findtext(f"{ATOM}published") or e.findtext(f"{ATOM}updated")
        content = e.findtext(f"{ATOM}content") or ""
        sub = sub_from_link(permalink) or feed_sub
        out.append({
            "title": title,
            "score": None,           # RSS does not expose score
            "num_comments": None,    # RSS does not expose comment count
            "permalink": permalink,
            "author": author,
            "subreddit": sub,
            "created_utc": to_epoch(published),
            "selftext": strip_html(content),
        })
        if len(out) >= limit:
            break
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
