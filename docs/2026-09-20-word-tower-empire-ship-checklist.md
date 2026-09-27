# Word Tower Empire — ship checklist (branch `feat/word-tower-empire`)

Run in order from `/Users/ohadfisher/git/boggle-tower/fe-next`. Verify by STATE, never by a reported exit code.

1. `git fetch origin && git rebase origin/master` (master moves under us; another session may have pushed).
2. Full gate, one at a time (`/tmp/wt2/gate.sh ship components/wordTowerV2 lib/wordTowerV2 app/api/word-tower`) — TSC_RC/ESLINT_RC/VITEST_RC all 0; `feel.test.ts` green and unmodified (`git diff origin/master -- lib/wordTowerV2/__tests__/feel.test.ts` must be empty).
3. `npm run build` with a `echo "RC=$?"` sentinel; confirm `.next/BUILD_ID` mtime is fresh (`find .next -maxdepth 1 -name BUILD_ID -mmin -5`). Webpack-bundles backend modules reachable from routes — the estate routes import `lib/wordTowerV2/estateServer.ts`, so only the build catches a bad specifier.
4. i18n: all 6 locales carry every new `wordTowerV2.*` key, then `npx --no-install tsx scripts/build-i18n-assets.ts --skip-brotli`; commit the regenerated `public/i18n` manifest.
5. Screenshot check at 390x844 and 1920x1080, `/en` and `/he`, signed in and as a guest.
6. Commit per phase (ask the user first), push, then verify with `git merge-base --is-ancestor <sha> origin/master` after a fetch — never the push's exit code.

## Must be true before ship
- [ ] Migration `20260919200000_word_tower_estates.sql` is in the branch AND applied to prod (it was applied 2026-09-19 via MCP; re-verify `information_schema.tables` + `pg_policies`).
- [ ] No estate write path trusts client numbers: coins/damage recomputed server-side, raid charges enforced.
- [ ] `next.config.mjs` unchanged — the red "1 Issue" badge in capture screenshots is the Next dev overlay, not app UI. Do NOT ship `devIndicators: false`.
- [ ] Art pack `public/images/word-tower-v2/empire/*` committed (82 files, ~2.1MB) with `MANIFEST.md`.

## Known open items (not blockers)
- Guest estate in `localStorage` is NOT migrated into the account on sign-in.
- `PagePresenceReporter` renders outside `AuthProvider` in `app/[locale]/layout.tsx:751` — app-wide, pre-existing; fix on master, not here (memory `page-presence-reporter-outside-authprovider-2026-09-20`).
- `useRunRewards` still exposes `flights`/`clearFlight`, now unrendered — simplify pass.
- Districts 2-3 reuse the district-1 economy curve; only the art differs.
