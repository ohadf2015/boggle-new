#!/usr/bin/env bash
# Put lexiclash.live behind Cloudflare's free CDN to cache Railway's static egress at the edge.
#
# WHY: the game's assets already ship immutable, max-age=31536000 (verified 2026-08-02) on both
# /_next/static/* and /public/* — but with no edge cache in front, every unique visitor (and LexiClash
# is embedded on CrazyGames/Poki/GameDistribution, so lots of one-time visitors) pulls the full asset
# payload straight from Railway origin. That was 194 GB / ~$9.71 of Railway egress in a month. A CDN
# caches each asset at the edge on first request and serves everyone else from there, so origin egress
# drops to ~one fetch per asset per edge PoP. No app code change is needed — the cache headers are
# already correct; the only missing piece is the edge.
#
# SCOPE: lexiclash.live only. It's the canonical domain (lexiclash.com just 301s to www.lexiclash.live)
# and it's the clean one — no MX/email, a single google-site-verification TXT. lexiclash.com is on Hover
# (no API creds) and only redirects, so it's intentionally left out.
#
# PREREQUISITES (the two things that blocked full automation from a dev machine on 2026-08-02):
#   1. CF_API_TOKEN with "Zone:Create" + "DNS:Edit" (the hermes CLOUDFLARE_API_TOKEN is DNS-only).
#      Create at https://dash.cloudflare.com/profile/api-tokens (template: "Edit zone DNS" won't do —
#      use a custom token with Account > Zone:Create and Zone > DNS:Edit, all zones).
#   2. After this script prints the Cloudflare nameservers, set them at Namecheap for lexiclash.live
#      (Domain List > Manage > Nameservers > Custom DNS). The Namecheap API is IP-whitelisted to a
#      single host, so this paste is manual unless run from that host.
#
# This script is idempotent: re-running finds the existing zone/records and updates in place.
set -euo pipefail

ZONE="lexiclash.live"
# Railway custom-domain CNAME targets (from the Railway API, 2026-08-02). These are per-domain and stable.
WWW_TARGET="8hp8ctw7.up.railway.app"    # www.lexiclash.live
APEX_TARGET="t8sztzmr.up.railway.app"   # lexiclash.live (apex; Cloudflare flattens the CNAME)
GOOGLE_TXT="google-site-verification=93OCSePZhTnyouqFY-3gCShmVQjrlwbb7W_ZTA379tk"

: "${CF_API_TOKEN:?Set CF_API_TOKEN (needs Zone:Create + DNS:Edit)}"
API="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json")

die() { echo "ERROR: $*" >&2; exit 1; }
# extract result[0].<field> from a Cloudflare list response on stdin (no eval — explicit key access)
first_field() { python3 -c "import json,sys;r=json.load(sys.stdin).get('result') or [];print(r[0].get(sys.argv[1],'') if r else '')" "$1"; }
# extract result.<field> from a single-object response on stdin
obj_field() { python3 -c "import json,sys;print(json.load(sys.stdin).get('result',{}).get(sys.argv[1],''))" "$1"; }

echo "==> Finding or creating zone $ZONE"
ZID=$(curl -s "${auth[@]}" "$API/zones?name=$ZONE" | first_field id)
if [ -z "$ZID" ]; then
  RESP=$(curl -s -X POST "${auth[@]}" "$API/zones" --data "{\"name\":\"$ZONE\",\"type\":\"full\"}")
  echo "$RESP" | python3 -c "import json,sys;d=json.load(sys.stdin);sys.exit(0 if d['success'] else (print(d['errors']) or 1))" \
    || die "zone create failed (token missing Zone:Create?)"
  ZID=$(echo "$RESP" | obj_field id)
fi
echo "    zone id: $ZID"

# upsert a DNS record by (type,name)
upsert() { # type name content proxied
  local type="$1" name="$2" content="$3" proxied="$4"
  local rid
  rid=$(curl -s "${auth[@]}" "$API/zones/$ZID/dns_records?type=$type&name=$name" | first_field id)
  local body="{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":$proxied,\"ttl\":1}"
  if [ -n "$rid" ]; then
    curl -s -X PATCH "${auth[@]}" "$API/zones/$ZID/dns_records/$rid" --data "$body" >/dev/null
    echo "    updated $type $name -> $content (proxied=$proxied)"
  else
    curl -s -X POST "${auth[@]}" "$API/zones/$ZID/dns_records" --data "$body" >/dev/null
    echo "    created $type $name -> $content (proxied=$proxied)"
  fi
}

echo "==> DNS records (proxied = orange cloud = goes through the CDN)"
upsert CNAME "www.$ZONE" "$WWW_TARGET"  true
upsert CNAME "$ZONE"     "$APEX_TARGET" true
upsert TXT   "$ZONE"     "$GOOGLE_TXT"  false

echo "==> SSL mode = full (Railway serves a valid cert on *.up.railway.app; 'full' avoids a redirect loop)"
curl -s -X PATCH "${auth[@]}" "$API/zones/$ZID/settings/ssl" --data '{"value":"full"}' >/dev/null
# Cloudflare caches static file extensions by default and respects the origin's immutable headers.
# Add one explicit cache rule so /_next/* and the /public asset dirs are cached even without an extension
# match, edge TTL following the origin's max-age (already a year).
echo "==> Cache rule for static asset paths"
RULESET=$(cat <<JSON
{"rules":[{
  "expression":"(starts_with(http.request.uri.path, \"/_next/\")) or (http.request.uri.path matches \"^/(images|music|mascot|mascots|mascot-new|showcase3d|multiplayer|seasons|sounds|audio|fonts|assets|collectibles|badges|avatars|archetypes|adventure-v2|practice|daily|gifs|stickers)/\")",
  "description":"Cache LexiClash static assets at edge",
  "action":"set_cache_settings",
  "action_parameters":{"cache":true,"edge_ttl":{"mode":"respect_origin"},"browser_ttl":{"mode":"respect_origin"}}
}]}
JSON
)
curl -s -X PUT "${auth[@]}" "$API/zones/$ZID/rulesets/phases/http_request_cache_settings/entrypoint" --data "$RULESET" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('    cache rule set' if d['success'] else '    cache-rule warn: '+str(d['errors']))"

echo
echo "==> DONE on the Cloudflare side. Assigned nameservers — set these at Namecheap for $ZONE:"
curl -s "${auth[@]}" "$API/zones/$ZID" | python3 -c "import json,sys;[print('     ',n) for n in json.load(sys.stdin)['result']['name_servers']]"
echo
echo "After the nameservers propagate (minutes-hours; the site keeps serving throughout because the old"
echo "records stay valid until they do), verify with:  curl -sI https://www.$ZONE/_next/static/  | grep -i cf-cache-status"
echo "A 'cf-cache-status: HIT' on a repeat request means the edge is serving it and Railway egress is dropping."
