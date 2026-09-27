status: shipped
attempted: Add school_lead_form_started tracking event to SchoolLeadForm for funnel visibility (viewed → started → submitted).

files_touched:
  - fe-next/components/education/SchoolLeadForm.tsx
  - fe-next/components/education/__tests__/SchoolLeadForm.test.tsx

change_summary: |
  Added `school_lead_form_started` PostHog event that fires once on the first field
  interaction. Uses React `onFocus` on the <form> element (maps to bubbling `focusin`)
  + a `useRef` gate so it fires exactly once per form mount regardless of how many fields
  the user touches. Test added (RED→GREEN): verifies (a) the event fires on first type,
  (b) does NOT fire a second time on subsequent field interaction.

  Prior funnel: school_lead_form_viewed → [gap] → school_lead_submitted
  New funnel:   school_lead_form_viewed → school_lead_form_started → school_lead_submitted

  The `started` cohort lets us answer: "How many people engage but never submit?"
  If school_lead_form_started >> school_lead_submitted, the form has friction (too long,
  wrong fields, wrong CTA copy). If started ≈ submitted, the bottleneck is upstream
  (traffic, CTA placement) not form design.

orientation: |
  Education upsell infrastructure is already mature:
  - for-schools page: full SchoolLeadForm + lead API + admin email notify
  - education hub + spelling-bee-practice: DistrictUpsellStrip (teacher + district CTAs)
  - esl-word-games, vocabulary-games-classroom, games-for-teachers: TeacherAccessCTA
    (individual + district link)
  - teacher dashboard: DistrictUpsellBanner (lime bar) + TrialUrgencyBanner when trial
  The infrastructure is complete. The gap was measurement of form engagement.

  Ad side: rewarded_ad_watched avg 1.7/day is low but tracking is fully wired
  (offered/watched/declined all tracked in useRewardedAd). It's a behavioral metric
  on Android users, not a tracking gap. The H5 web ad gate (NEXT_PUBLIC_H5_ADS_ENABLED)
  remains off (pending AdSense approval).

next_steps: |
  1. After ~1 week, query PostHog for school_lead_form_started vs school_lead_submitted
     ratio — if started >> submitted, shorten the form (remove country + interests fields
     as optional). If started ≈ 0, the problem is CTA placement/copy upstream.
  2. Consider adding DistrictUpsellStrip to esl-word-games / vocabulary-games-classroom
     REPLACING TeacherAccessCTA (more prominent dual CTA) — but TeacherAccessCTA already
     has both individual + district links, so evaluate based on click-through data first.
  3. Teacher dashboard: after a classroom game session ends, consider a warm "Like this?
     Get school plan analytics" modal — highest-intent upsell moment not yet captured.
  4. Revenue snapshot: founder should run scripts/nightly/lib/pull-revenue-snapshot.sh
     (interactive Playwriter) or provision ADMOB_API_TOKEN for unattended revenue data.
     The nightly brief is thin (only 1 ad metric visible) because the snapshot is stale.
