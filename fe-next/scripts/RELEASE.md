# Android Release Automation

## One-time setup

1. **Service account for Play Developer API**
   - Google Cloud Console → IAM & Admin → [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) → Create service account.
   - Skip role grants in GCP (not needed). Click Done.
   - Open the new SA → Keys → Add Key → JSON → download.
   - Save to `~/.config/play-console-sa.json` (chmod 600).
   - Play Console → Users and permissions → Invite new users → paste SA email (`…@…iam.gserviceaccount.com`) → app access: LexiClash → account permissions: "Release manager" (or: View app info, Manage testing tracks, Create/edit releases) → Invite.
   - Note: linking Play Console to a GCP project is no longer required (deprecated 2024).

2. **Upload keystore env vars** (put in `~/.zshrc` or direnv):
   ```
   export ANDROID_KEYSTORE_PATH="$HOME/git/boggle-new/fe-next/android/lexiclash-release.keystore"
   export ANDROID_KEY_ALIAS="<alias>"
   export ANDROID_KEYSTORE_PASSWORD="<pw>"
   export ANDROID_KEY_PASSWORD="<pw>"
   ```

3. **Play App Signing deployment cert** (one-time, already done — SHA `C9:20:6C:B2:…:55:8D`)
   - Play Console → App integrity → App signing → Download app signing key certificate (`.der`).
   - `npm run assetlinks:from-cert -- /path/to/deployment_cert.der`
   - Commit updated `public/.well-known/assetlinks.json` and deploy web (Railway).
   - Run `npm run verify:assetlinks` until Google cache flips (can take ~5 min).

4. **Install Fastlane**
   ```
   brew install fastlane   # or: gem install fastlane
   ```

## Release commands

- `npm run release:android`          — build + upload to internal track (draft)
- `npm run release:android:prod`     — same, then promote internal → production
- `npm run verify:assetlinks`        — sanity check Google statements API
- `npm run assetlinks:from-cert -- <der>` — merge a cert SHA into assetlinks.json

Version: `versionCode = git rev-list --count HEAD`, `versionName = package.json version`. Override via `VERSION_CODE` / `VERSION_NAME` env.

## Troubleshooting

- **Upload key mismatch** — Play rejects AAB with "not signed with upload certificate". Two options:
  1. Find the correct keystore locally (whichever produces the SHA registered as upload cert in Play Console → App signing).
  2. Play Console → App signing → "Request upload key reset" (24–48h turnaround), then re-sign with current keystore.
- **Asset Links still failing after deploy** — CDN cache; run `npm run verify:assetlinks` repeatedly. Google polls `digitalassetlinks.googleapis.com` with its own cache (~5 min TTL).
