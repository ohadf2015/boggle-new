#!/bin/bash
# landing-cards.sh — surface URLs of landing/page routes the nightly run touched, so
# the founder can tap-to-open them from the Telegram digest (goal 2026-06-23: "if we
# add new landing pages i want their urls").
#
# WHY a lib (not inline awk like the other report cards): the path→URL mapping has real
# edge cases (Next route groups (..), [locale] dynamic seg, nested depth, root page) that
# are worth one tested seam. Tested by test/landing-cards.test.sh.

# nightly_page_to_url_path <app-router page file path>
# Maps a Next.js app-router page file to its public URL PATH (leading slash, no domain).
#   fe-next/app/[locale]/foo/page.tsx     -> /en/foo
#   fe-next/app/(marketing)/promo/page.tsx -> /promo   (route group dropped)
#   fe-next/app/page.tsx                  -> /
# Returns nonzero when the route has a non-locale dynamic segment ([slug]) whose value
# we can't know — no URL can be formed, so the caller skips it.
nightly_page_to_url_path() {
  local f="$1"
  f="${f##*/app/}"          # strip everything up to and including .../app/
  case "$f" in
    page.*) echo "/"; return 0 ;;   # app/page.tsx -> root
  esac
  f="${f%/page.*}"          # drop trailing /page.tsx
  local out="" seg
  local IFS='/'
  for seg in $f; do
    case "$seg" in
      '') continue ;;
      '('*')') continue ;;          # route group — not part of the URL
      '[locale]') out="$out/en" ;;  # sample locale for the founder to open
      '['*']') return 1 ;;          # other dynamic segment — value unknown, skip route
      *) out="$out/$seg" ;;
    esac
  done
  echo "${out:-/}"
  return 0
}

# nightly_landing_url_block <authored-file-list> [domain] [max]
# Reads a newline list of repo-relative file paths (the night's authored files), keeps the
# app-router page routes, and prints a Telegram-ready block of tappable full URLs (deduped,
# capped at max, default 6). Returns nonzero with no output when there are no page routes.
nightly_landing_url_block() {
  local authored="$1" domain="${2:-https://www.lexiclash.live}" max="${3:-6}"
  [ -f "$authored" ] || return 1
  local seen="" urls="" count=0 f p
  while IFS= read -r f; do
    case "$f" in
      */app/*/page.tsx|*/app/page.tsx) ;;   # app-router page file only
      *) continue ;;
    esac
    p=$(nightly_page_to_url_path "$f") || continue
    case "$seen" in *"|$p|"*) continue ;; esac   # dedup identical URL paths
    seen="$seen|$p|"
    urls="$urls
${domain}${p}"
    count=$((count+1))
    [ "$count" -ge "$max" ] && break
  done < "$authored"
  [ "$count" -eq 0 ] && return 1
  printf '🌐 *New / updated pages* (live after the next deploy):%s\n' "$urls"
  return 0
}
