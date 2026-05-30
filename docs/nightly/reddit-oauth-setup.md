# Reddit OAuth setup (nightly lane 04)

**Status (2026-05-30):** the old unauthenticated `curl` to `www.reddit.com/*.json` now
returns **HTTP 403 + an HTML block page** for every User-Agent — Reddit closed the
anonymous JSON gate. `scripts/nightly/lib/reddit-fetch.sh` now uses **OAuth** when
credentials are present and falls back to the (currently-403) UA path when they are not.
Until the four env vars below are set, lane 04 produces **zero Reddit drafts** and relies
on WebSearch only.

This is a **one-time ~10-minute manual step** (creating a Reddit app needs an interactive
login — it cannot be automated). After it's done the nightly picks it up automatically.

## 1. Create a Reddit "script" app

1. Sign in to Reddit as the account that will post replies (e.g. `/u/lexiclash`).
2. Go to <https://www.reddit.com/prefs/apps> → **"create another app…"**.
3. Fill in:
   - **name:** `lexiclash-nightly`
   - **type:** **script**  ← important (script apps support the password grant)
   - **redirect uri:** `http://localhost:8080` (unused, but required)
4. Create. Then read:
   - **client id** — the short string just under the app name ("personal use script").
   - **secret** — the `secret` field.

## 2. Add credentials to the nightly env

Append to `~/.config/lexi-nightly/env` (chmod 600 — it already holds other secrets):

```bash
REDDIT_CLIENT_ID=xxxxxxxxxxxxxx
REDDIT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
REDDIT_USERNAME=lexiclash
REDDIT_PASSWORD=your-reddit-account-password
# optional override; a descriptive UA is recommended by Reddit:
# REDDIT_USER_AGENT="macos:lexiclash-nightly:v1.0 (by /u/lexiclash)"
```

- All four → **password grant** (full read access, most reliable for a script app).
- `CLIENT_ID` + `CLIENT_SECRET` only → **client_credentials** (app-only) is attempted, but
  Reddit has narrowed app-only read; prefer the password grant.
- If the account has 2FA, append the TOTP to the password as `password:123456`, or disable
  2FA for this bot account.

## 3. Verify

```bash
# loads the env, then fetches a real listing:
set -a; . ~/.config/lexi-nightly/env; set +a
bash scripts/nightly/lib/reddit-fetch.sh feed wordgames top week 3 | jq '.[].title'
```

Expected: 3 real post titles. If you see `{"error":…}`, double-check the four vars and
that the app **type is "script"**. The helper always exits 0, so the nightly never blocks
on Reddit being down — it just degrades to WebSearch.

## How it works

- `reddit-fetch.sh` exchanges the creds for a bearer token at
  `https://www.reddit.com/api/v1/access_token`, caches it (~50 min) in `$TMPDIR`, then
  queries `https://oauth.reddit.com/r/<sub>/<sort>` / `/search` with the bearer header.
- No creds, or a failed exchange → it falls back to the legacy UA curl against
  `www.reddit.com` (currently 403, but graceful).
- Rate limit on OAuth: 100 requests/minute — far above lane 04's handful of calls.
