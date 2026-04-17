# Android Release Automation

## One-time setup

1. **Play Developer API service account**
   - Play Console -> Setup -> API access -> Create new service account (opens GCP).
   - Grant role `Service Account User`; in Play Console grant `Release manager` (or Admin).
   - Download JSON key -> save to `~/.config/play-console-sa.json` (chmod 600).

2. **Upload keystore env vars** (put in `~/.zshrc` or direnv):
   ```
   export ANDROID_KEYSTORE_PATH="$HOME/git/boggle-new/fe-next/android/app/lexiclash-release.keystore"
   export ANDROID_KEY_ALIAS="<alias>"
   export ANDROID_KEYSTORE_PASSWORD="<pw>"
   export ANDROID_KEY_PASSWORD="<pw>"
   ```

3. **Play App Signing deployment cert** (one-time)
   - Play Console -> App integrity -> App signing -> Download app signing key certificate (`.der`).
   - `npm run assetlinks:from-cert -- /path/to/deployment_cert.der`
   - Commit updated `public/.well-known/assetlinks.json` and deploy web (Railway).
   - Run `npm run verify:assetlinks` until Google cache flips (can take ~5 min).

4. **Install Fastlane**
   ```
   brew install fastlane   # or: gem install fastlane
   ```

## Release commands

- `npm run release:android`          — build + upload to internal track (draft)
- `npm run release:android:prod`     — same, then promote internal -> production
- `npm run verify:assetlinks`        — sanity check Google statements API
- `npm run assetlinks:from-cert -- <der>` — merge a cert SHA into assetlinks.json

Version: `versionCode = git rev-list --count HEAD`, `versionName = package.json version`. Override via `VERSION_CODE` / `VERSION_NAME` env.
