status: shipped
attempted: add source_page attribution to DistrictUpsellStrip education upsell analytics (TDD, 2 files)

files_touched:
  - fe-next/components/education/DistrictUpsellStrip.tsx
  - fe-next/components/education/__tests__/DistrictUpsellStrip.test.tsx

what_changed: |
  DistrictUpsellStrip now calls usePathname() and passes source_page to all
  trackGrowthEvent calls (education_upsell_impression + landing_cta_clicked).
  Previously ALL education upsell events were indistinguishable in PostHog —
  no way to tell if clicks came from spelling-bee-practice vs the education hub.
  Now each event includes the full pathname, enabling funnel attribution.
  Tests updated to assert source_page: '/' (global vitest mock default).

revenue_rationale: |
  School/district leads = the biggest untapped revenue lever. Without source_page
  attribution we can't tell which education pages drive qualified leads to
  /education/for-schools. This unlocks the ability to optimize the highest-converting
  pages and cut investment in low-converting ones.

context: |
  - DistrictUpsellStrip is mounted on: /education (hub) + /education/spelling-bee-practice
  - TeacherAccessCTA (on games-for-teachers, esl-word-games, vocabulary-games-classroom)
    still has ZERO click analytics — see next_steps
  - classroom-game has hardcoded for-schools CTA (no analytics, no t() keys)
  - for-schools page has SchoolLeadForm tracking school_lead_submitted + role + student_count

next_steps: |
  1. Add trackGrowthEvent click events to TeacherAccessCTA — 3 high-traffic education
     pages (games-for-teachers, esl-word-games, vocabulary-games-classroom) have zero
     CTA click analytics; add source_page there too
  2. classroom-game for-schools CTA uses hardcoded locale dict not t() keys — migrate
  3. Check PostHog school_lead_submitted 7d count to baseline before/after improvements
  4. AdSense web H5 ads still gated — await re-submission after crawl cycle

guardrail_check: |
  No coin amounts changed / no billing touched / no new ad surfaces / no fake stats.
  Analytics-only change, fully reversible.
