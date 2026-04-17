# Android Release Status — live.lexiclash.app

**Updated:** 2026-04-18

## Current Blocker
Google upload-key reset request pending (24-48h, manual approval). Everything else green.

## Keystore (v2 — new upload key)
- Path: `android/lexiclash-upload-v2.keystore` (also referenced as `lexiclash-release.keystore` via env)
- Alias: `upload`
- Creds env: `~/.config/lexiclash-keystore-creds.env` (chmod 600)
  - `ANDROID_KEYSTORE_PATH`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`
  - PKCS12 constraint: store pw == key pw
- Cert validity: 17/04/2026 → 02/09/2053, SHA384withRSA, 2048-bit

## Backups
- Tarball: `~/Desktop/lexiclash-keys-20260418.tar.gz` (3243 B)
  - SHA-256: `db1875cd9644ffec83695ac8df1c8e4c5dc0a2f098b23fee6b7da49f420170dd`
- Gmail draft: `r551455437666048999` to `ohadf2015@gmail.com` — **user must click Send manually** (Gmail MCP has no send tool)
- After send: `rm ~/Desktop/lexiclash-keys-20260418.tar.gz /tmp/keystore_b64.txt /tmp/keystore_sha.txt`

## Play Console (devId 5300390829007478477, app live.lexiclash.app)
- SA `play-console@lexiclash.iam.gserviceaccount.com` — Active, all 13 app perms (Admin)
- SA `lexiclash-bot@lexiclash.iam.gserviceaccount.com` — Active (legacy, also full perms)
- Effective SA = whoever's email matches `~/.config/play-console-sa.json` (currently `play-console@`)

## Service Account JSON
- Path: `~/.config/play-console-sa.json` (chmod 600)
- client_email: `play-console@lexiclash.iam.gserviceaccount.com`
- project_id: `lexiclash`
- Validated: `fastlane run validate_play_store_json_key` → "Successfully established connection"

## Built AAB
- Path: `android/app/build/outputs/bundle/release/app-release.aab` (~11.25 MB)
- Signed by v2 upload cert (PKIX warning is expected — Play resigns w/ deployment cert)

## Post-Approval Release Command
```bash
set -a && source ~/.config/lexiclash-keystore-creds.env && set +a && \
  cd /Users/ohadfisher/git/boggle-new/fe-next && npm run release:android
```

## Build Chain (release-android.sh)
1. `npm run build` (Next static export)
2. `npx cap sync android` (Capacitor sync)
3. `./gradlew --no-daemon :app:bundleRelease` (signed AAB via env-driven signingConfig in `android/app/build.gradle:24-43`)
4. `fastlane android internal` → upload to Internal track
5. Optional: `fastlane android promote_to_production`

## Key Files
- `android/app/build.gradle` — signingConfigs.release reads env vars
- `fastlane/Appfile` + `android/fastlane/Appfile` — `json_key_file(ENV["PLAY_SA_JSON"] || "~/.config/play-console-sa.json")`
- `scripts/release-android.sh` — orchestrator
- `package.json` — `release:android` script

## Gotchas Encountered
- Gmail MCP: no send/attachment tools — only `create_draft`. Workaround: base64 inline in body.
- Play Console UI: native `<tr>` returns 0; must use `getByRole('row')` / `getByRole('checkbox')`.
- Fastlane SA email must match Play Console user — JWT signed for `client_email` in JSON.
- Background bash CWD defaults to `boggle-new/`, not `fe-next/` — set explicitly.
