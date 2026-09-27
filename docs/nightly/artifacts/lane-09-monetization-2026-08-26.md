status: research-only
attempted: audit the two default monetization levers (education lead-gen, rewarded-ad instrumentation) before adding anything new

findings:
- Education institutional upsell (top priority per prompt) is ALREADY fully shipped and wired,
  not a gap: `/[locale]/education/for-schools` has hero CTA + pricing ($149/yr school plan,
  district-on-request) + `SchoolLeadForm` linked from the education hub (`education/PageClient.tsx:158,208`
  and `education/page.tsx:270`). Form posts to `app/api/education/school-lead/route.ts` which validates,
  rate-limits (fail-open, logged), inserts to `school_leads`, and fires an admin email notify
  (fire-and-forget). Not a silent-failure path — Class 4 checklist verified clean.
- Rewarded-ad instrumentation (brief's only signal: rewarded_ad_watched 0/24h, severity 0.4, reach 0)
  is already fully wired: `rewarded_ad_offered` / `_watched` / `_declined` all emit
  (`utils/growthTracking.ts:1336,1347,1358`), and `hooks/useAdMob.ts:69-80` already has the fix for the
  known "offered-with-no-downstream-breadcrumb" stranding bug (onError now always fires). The 0/24h
  reading is most likely just low traffic in the last 24h window, not an instrumentation gap — brief
  itself flagged low reach/severity and stale search sources.
- Recent commits (last 2 nights) already shipped Teacher Pro plan comparison + trial-expiry upsell —
  this area has had heavy recent investment; re-touching tonight risked duplicate/colliding work under
  a ~10min budget with no clear new gap identified.

- **PostHog-verified (query-trends, 30d, `growth:school_lead_form_viewed` /
  `growth:school_lead_submitted`): 3 total form views, 0 submissions in 30 days.** The form/backend
  are not the problem (both audited clean above) — the page is essentially undiscovered. 3 views/mo
  from a page linked off the education hub's own nav means either the hub itself gets near-zero
  traffic, or the "For Schools" link is buried/low-CTR within it. This is the real bottleneck for the
  institution-upsell channel, not anything fixable in a code diff tonight.

files_touched: none (audit only, no code changed)
next_steps:
- **Highest-value next action for this lane: traffic/discoverability to `/education/for-schools`, not
  more form/UX work.** Check `growth:landing_view`/hub pageviews to see if the hub itself is the
  bottleneck or just this link's placement; consider promoting the "For Schools" CTA higher/bolder on
  the hub, or a targeted SEO push (title/keywords already decent — `for-schools/page.tsx` has solid
  metadata, so likely an internal-linking or backlink problem, not on-page SEO).
- Founder: run `scripts/nightly/lib/pull-revenue-snapshot.sh` (Playwriter) or provision
  ADMOB_API_TOKEN — the revenue brief has been thin/stale multiple nights running, which is the
  actual blocker to picking a sharper ad-side action.
- Consider: web H5 AdSense is still "pending approval" per brief — once approved, wiring the ad surface
  is a real lever; nothing to do there tonight (gated on external approval, owned by Lane 08 content work).
