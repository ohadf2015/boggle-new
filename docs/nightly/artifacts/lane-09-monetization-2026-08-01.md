status: research-only
attempted: impact-check on 07-27 teacher_pro iap_viewed impression fix + scoped for-schools/education upsell review

## Impact check (ledger appended)
`growth:iap_viewed` WHERE product=teacher_pro AND event_type=impression, 7d = **0** (baseline was 0). Verdict: neutral (not regressed — genuinely zero traffic, not a broken emit).
Cross-check: only 2 `growth:iap_viewed` events fired repo-wide in 14d, both with EMPTY product/event_type — traced to a *different* call site (`RemoveAdsProbe.tsx`/`SupporterInterestCard.tsx`, which omit those props), not teacher/PageClient.tsx. So the 07-27 fix is correctly wired (code reads right: `trackGrowthEvent('iap_viewed', { product: 'teacher_pro', ..., event_type: 'impression' })` at teacher/PageClient.tsx:32) — the real blocker is the teacher dashboard page has ~0 visits, not a tracking bug. Root cause is discoverability of `/[locale]/teacher`, not instrumentation.

## Education upsell (for-schools) — already comprehensive
`app/[locale]/education/for-schools/page.tsx` already ships: SchoolLeadForm, pricing table ($149/yr school plan, free teacher trial), competitor comparison, FAQ (JSON-LD), 2 CTAs + closing CTA. Linked from `/education` hub already (verified via rg). No gap found here — this channel is well-built, just needs traffic (SEO/blog, owned by lane 06/08).

## Backlog for next lane 09 run (ranked)
1. **Teacher dashboard traffic = 0** — the iap_viewed impression event literally never fires because nobody lands on `/[locale]/teacher`. Check discoverability: is there any link INTO `/teacher` from authed teacher-role UI? Grep `href.*\/teacher` app-wide. If it's not linked from anywhere reachable, that's the actual fix (not the event code).
2. `RemoveAdsProbe`/`SupporterInterestCard` iap_viewed calls omit `product`/`event_type` — low priority, but worth adding those 2 keys so the metric taxonomy stays consistent (S-effort, next lane).
3. Rewarded-ad brief signal (`rewarded_ad_watched` 1/24h vs 7d avg 3.4) — down but single-day noise, not enough to act on; re-check next run with more days.

files_touched: none (code)
docs_touched: docs/nightly/impact-ledger.ndjson (verdict append)
next_steps: grep for /teacher route entry points (nav/dashboard links) to find why teacher_pro impression traffic is 0; if genuinely unlinked, wire a discoverable entry point next lane.
