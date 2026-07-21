---
status: shipped
files_touched:
  - fe-next/app/[locale]/teacher/upgrade/PageClient.tsx
  - fe-next/app/[locale]/teacher/upgrade/__tests__/PageClient.test.tsx
  - docs/nightly/impact-ledger.ndjson
next_steps: >
  Monitor iap_viewed{product:district_inquiry} clicks + school_lead_submitted events.
  If clicks up but school_lead_submitted stays 0, form has a conversion problem (too long).
  Revenue-snapshot absent — founder should run pull-revenue-snapshot.sh or provision
  ADMOB_API_TOKEN for unattended data.
---

## Impact check (07-14 district_role_card CTA)
Verdict: neutral — 0 clicks in 7 days (baseline was 0). Traffic to unauthenticated
education hub is very thin.

## Shipped: district CTA routes to SchoolLeadForm

**Problem**: Teacher upgrade page district CTA used mailto: directly — leads went to
unstructured inbox, never captured in school_leads Supabase table, not tracked as
school_lead_submitted, no structured data (role/student_count/interests).

**Fix**: Changed `<a href="mailto:...">` to `<Link href="/{locale}/education/for-schools">`.
Structured form already exists with rate-limiting, DB insert, admin email notification.
Existing iap_viewed{product:district_inquiry} click event preserved.

**TDD**: Failing test added first — asserts CTA href = /en/education/for-schools (not
mailto). Lint exit 0.

## Observations
- school_lead_form_viewed: 2 events in 30d (very low traffic)
- school_lead_submitted: 0 events ever (never fired — no conversions yet)
- rewarded_ad_watched 0/24h = noise (sporadic 1-2/day pattern across 14d, not regression)
- Revenue brief thin — revenue-latest.json absent. Human: run pull-revenue-snapshot.sh
