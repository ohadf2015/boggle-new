# Android Release Status — live.lexiclash.app

**Updated:** 2026-06-07

## Play Games Services (PGS) — native bridge (2026-06-07)
Console config done (both Android credentials: app-signing + upload-key; 4/6 setup tasks). JS bridge SHIPPED in-repo, **native half UNVERIFIED here** (no device build).

- **Plugin:** `@openforge/capacitor-game-connect@^5.0.2` (installs under `.npmrc legacy-peer-deps`; peer is `@capacitor/core ^5` vs our **8** — JS imports fine, NATIVE compile under Cap 8 is the open risk a device build must clear).
- **Code:** `utils/nativePGS.ts` (Android-only singleton bridge: signIn/submitLeaderboardScore/unlock+incrementAchievement/showLeaderboard/showAchievements, all no-op off Android) + `hooks/usePlayGamesServices.ts`. TDD 17 green, tsc0/lint0/build0.
- **Verification boundary** — done here: vitest + tsc (typed vs real plugin contract) + `npm run build`. NOT done here ↓.

### Native finish checklist (device required)
1. `npx cap sync android` — generates the plugin's native module into gitignored `android/`.
2. Verify gradle compiles the plugin under Cap 8 (the peer-version risk). If it fails, pin/patch or fork the plugin's `android/build.gradle`.
3. ~~Define achievements + leaderboards in Play Console~~ **DONE** (Draft, "available to testers"): 2 leaderboards + 6 achievements created via Playwriter. IDs live in `lib/playGames/playGamesIds.ts` (env-overridable). 165/2000 achievement points used. Icons still needed for PUBLISH (none uploaded). i18n descriptions (he/sv/ja/es) still en-only.
   - Leaderboards: All-Time Score `CgkIruzLyugaEAIQAg`, Daily Challenge `CgkIruzLyugaEAIQAw`
   - Achievements: First Word `…BA`(5) · First Victory `…BQ`(10) · On a Roll `…Bg`(25) · Polyglot `…Bw`(25) · Word Smith `…CA`(50,incr500) · Daily Devotee `…CQ`(50,incr30)
4. Wire real game-end events. **DONE for score+win** via `lib/playGames/awardPlayGames.ts awardGameEnd()` called fire-and-forget from `trackGameEnd()` (score→All-Time + Daily; win→First Victory). **TODO for the other 5 achievements** (firstWord/wordSmith[incr]/polyglot/onARoll/dailyDevotee) — each needs its own event source, not game-end. IDs + bridge helpers ready. **Gate on sign-in:** on-device, `signInPlayGames()` must succeed before submit/unlock register. NB: bridge is now reachable from layout via `NativePGSInitializer` so the plugin JS DOES bundle (build-verified); native gradle compile still device-gated.
5. Build a SIGNED build whose cert matches a PGS credential; test sign-in on device (both Play-signed prod download AND upload-key sideload).
6. PGS sign-in is Games-scoped — kept ORTHOGONAL to Supabase/`nativeOAuth` identity session. Do not route tokens between them.
7. **Publish PGS project** in Console — outward-facing, parked until explicit go.

Spec: `docs/2026-06-07-play-games-services-native-bridge-spec.md`. Console state memory: `play-games-services-config-2026-06-07`.

---

## Last Release
versionCode **5713** built + uploaded to **internal** then **promoted to production** 2026-06-04 ~00:49 CEST via `npm run release:android:prod`. Purpose: submit a fresh binary so Google **re-reviews** the corrected Google Families / "Social Apps & Features" policy declaration (chat/DM age-gate + capability enforcement fix `69ae2d905` + `2fdedf2c9`, web-served from `www.lexiclash.live` — remote-URL Capacitor app, fix is NOT in the AAB). Both fastlane lanes returned "Successfully finished the upload to Google Play"; `deactivate_on_promote: true` so 5713 lives on production only. Now in Play review. versionName 0.1.0.

**Production access gate cleared** — the old 12-tester × 14-day blocker no longer applies; `promote_to_production` succeeded with no precondition error.

## Prior Release
versionCode **4073** uploaded 2026-04-30 ~01:57 to **internal** track. Ships **Blast Sprint 1 + 2** — clarity guards (persistent goal banner, "Just N tiles short" fail card, mid-game toast cleanup, DDA Lucky Boost chip, 14 retired tiles via spawn-flag flip) + new semantic goals (`target_word` Wordscapes-style + `color_power` Royal-Match-style). Solver, deterministic seeding, +50/+30 bonus scoring all wired end-to-end. 1249 tests green. 7 commits: `3254c0b31` → `5bf8f7ac6`.

Prior: 4019 (AdMob Banner Clearance Sweep), 4018 (margin fix patch), 3968 (segmented AdMob units), 3966 (native polish), 3959 (UNIMPLEMENTED plugin re-release), 3766 (launch-crash fix).

Fastfile retargeted 2026-04-21: both `internal` and `promote_to_production` lanes now use `track: "internal"` (was `"alpha"`). Internal track exempts the 12-tester × 14-day production gate and propagates in minutes. Prereq: Play Console → Testing → Internal testing must have an active release created manually once, otherwise `supply` returns `Precondition check failed`.

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

## Crashlytics Wiring (android/ is gitignored — reapply after fresh clone/sync)

`android/build.gradle` classpath block needs:
```gradle
classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.2'
```

`android/app/build.gradle` dependencies:
```gradle
implementation platform('com.google.firebase:firebase-bom:33.5.1')
implementation 'com.google.firebase:firebase-crashlytics'
implementation 'com.google.firebase:firebase-analytics'
```

And inside the existing `try { servicesJSON ... }` block, alongside `google-services`:
```gradle
apply plugin: 'com.google.firebase.crashlytics'
```

`cap sync` regenerates android/ but preserves `build.gradle` if already edited — verify after sync.

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
