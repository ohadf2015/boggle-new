#!/bin/bash
# reddit-browser-fetch.sh — fetch r/<sub> listings / search via the user's REAL
# logged-in Chrome through the Playwriter extension, scraping old.reddit.com.
#
# WHY: as of 2026-05 every *programmatic* Reddit path is blocked — the Data API needs
# manual approval, www/old.reddit .json returns 403+HTML for all UAs, DuckDuckGo
# scraping returns a bot-challenge, and Anthropic's WebSearch/WebFetch crawler is
# blocked by reddit.com. The ONLY channel that still works is an authenticated *browser*
# session reading old.reddit pages (normal human browsing, residential IP, real cookies).
# This drives that session via Playwriter. INTERACTIVE ONLY — needs Chrome open with the
# Playwriter extension enabled and a logged-in reddit session. NOT available unattended
# at 02:00; the nightly keeps WebSearch for non-Reddit research.
#
# Usage (same surface as reddit-fetch.sh):
#   reddit-browser-fetch.sh feed   <subreddit> [sort=top] [t=week] [limit=10]
#   reddit-browser-fetch.sh search <query>     [sort=relevance] [t=week] [limit=10]
#
# Output: compact JSON array [{title,score,num_comments,permalink,author,created_utc,
# subreddit,selftext}] on success, or {"error":...} on failure. ALWAYS exits 0.
# Tested by test/reddit-browser-fetch.test.sh (pure URL builder).
set -uo pipefail

PW="${PLAYWRITER_BIN:-playwriter}"

_emit_err() { echo "{\"error\":\"$1\"}"; exit 0; }

# Pure URL builder — old.reddit endpoints. Testable without a browser.
# Echoes the listing URL for the given mode+args. Empty on bad mode.
reddit_browser_url() { # <mode> <arg> <sort> <t> <limit>
  local mode="$1" arg="$2" sort="$3" t="$4" limit="$5"
  case "$mode" in
    feed)
      printf 'https://old.reddit.com/r/%s/%s/?t=%s&limit=%s' "$arg" "$sort" "$t" "$limit" ;;
    search)
      local q
      q=$(printf '%s' "$arg" | jq -sRr @uri)
      printf 'https://old.reddit.com/search?q=%s&sort=%s&t=%s&limit=%s&include_over_18=on' "$q" "$sort" "$t" "$limit" ;;
    *) return 1 ;;
  esac
}

# Only build URL + run browser when executed directly (lets the test source the builder).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  MODE="${1:-}"; shift || true
  case "$MODE" in
    feed)   ARG="${1:?usage: reddit-browser-fetch.sh feed <subreddit> [sort] [t] [limit]}"
            SORT="${2:-top}"; T="${3:-week}"; LIMIT="${4:-10}" ;;
    search) ARG="${1:?usage: reddit-browser-fetch.sh search <query> [sort] [t] [limit]}"
            SORT="${2:-relevance}"; T="${3:-week}"; LIMIT="${4:-10}" ;;
    *) _emit_err "usage: reddit-browser-fetch.sh feed|search ..." ;;
  esac

  command -v "$PW" >/dev/null 2>&1 || _emit_err "playwriter CLI not found (interactive browser tool required)"
  URL=$(reddit_browser_url "$MODE" "$ARG" "$SORT" "$T" "$LIMIT") || _emit_err "bad mode"

  # Reuse an already-connected session if given (Playwriter holds ONE CDP connection at a
  # time — a second `session new` can't bind while another session is live). Standalone,
  # `session new` is correct. Set PLAYWRITER_SESSION to ride an existing session.
  SID="${PLAYWRITER_SESSION:-}"
  [ -n "$SID" ] || SID=$("$PW" session new 2>/dev/null | tail -1)
  [ -n "$SID" ] || _emit_err "could not open a playwriter session (is Chrome + the extension running?)"
  OUT=$(mktemp -t reddit-browser.XXXXXX.json)

  # JS scrapes old.reddit's #siteTable rows. No backticks (avoid bash interpolation hazards);
  # path + limit injected by string concat. Writes the JSON array to OUT via fs.
  JS='const fs=require("fs");
try{
  state.p = (state.p && !state.p.isClosed()) ? state.p : await context.newPage();
  await state.p.goto("'"$URL"'", {waitUntil:"domcontentloaded"});
  await state.p.waitForTimeout(1200);
  const listingN = await state.p.locator("#siteTable > .thing.link").count();
  const sel = listingN>0 ? "#siteTable > .thing.link" : ".search-result-link";
  const rows = await state.p.locator(sel).evaluateAll((els)=>els.slice(0,'"$LIMIT"').map((e)=>{
    const q=(s)=>e.querySelector(s);
    if(e.classList.contains("search-result-link")){
      const t=q("time");
      return {
        title:((q("a.search-title")||{}).innerText||"").trim().slice(0,200),
        score:parseInt(((q("span.search-score")||{}).innerText||"").replace(/[^0-9]/g,""))||0,
        num_comments:parseInt(((q("a.search-comments")||{}).innerText||"").replace(/[^0-9]/g,""))||0,
        permalink:(q("a.search-comments")||q("a.search-title")||{}).href||"",
        author:(q("a.author")||{}).innerText||"",
        subreddit:((q("a.search-subreddit-link")||{}).innerText||"").replace(/^r\//,""),
        created_utc:(t&&t.getAttribute("datetime"))?Math.round(Date.parse(t.getAttribute("datetime"))/1000):0,
        selftext:""
      };
    }
    const scoreEl=q(".score.unvoted");
    const ts=e.getAttribute("data-timestamp");
    return {
      title:((q("a.title")||{}).innerText||"").trim().slice(0,200),
      score:parseInt((scoreEl&&(scoreEl.getAttribute("title")||scoreEl.innerText))||"0")||0,
      num_comments:parseInt(((q("a.comments")||{}).innerText||"").replace(/[^0-9]/g,""))||0,
      permalink:e.getAttribute("data-permalink")?("https://www.reddit.com"+e.getAttribute("data-permalink")):((q("a.comments")||{}).href||""),
      author:e.getAttribute("data-author")||"",
      subreddit:e.getAttribute("data-subreddit")||"",
      created_utc:ts?Math.round(parseInt(ts)/1000):0,
      selftext:""
    };
  }));
  fs.writeFileSync("'"$OUT"'", JSON.stringify(rows));
  console.log("ok:"+rows.length);
}catch(err){ fs.writeFileSync("'"$OUT"'", JSON.stringify({error:String(err).slice(0,160)})); }'

  "$PW" -s "$SID" --timeout 40000 -e "$JS" >"${REDDIT_BROWSER_LOG:-/dev/null}" 2>&1 || true

  if [ -s "$OUT" ]; then
    cat "$OUT"; echo
  else
    _emit_err "browser fetch produced no output (extension not connected, or not logged in)"
  fi
  rm -f "$OUT" 2>/dev/null || true
fi
