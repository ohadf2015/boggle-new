status: shipped
attempted: fix stale "early access" framing in school lead form success message — remove wait-list implication, add concrete 1-2 day response timeline
files_touched:
  - fe-next/translations/en.js
  - fe-next/translations/es.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/he.js
change: education.forSchools.form.success_body across all 5 locales — removed "early access to school features" (stale, implies wait-list) replaced with "confirm trial access + share school plan details within 1-2 business days" (product is live, response is concrete)
guardrail_check:
  - no coin amounts changed
  - no ad surfaces added
  - no fake stats
  - truthful framing only (trial access + school plans ARE live)
  - non-EN strings are AI-generated — flag for native review
revenue_rationale: leads who read "early access to school features" may assume they are joining a long wait list and not follow up; concrete timeline + "trial access" framing signals the product is ready now
next_steps:
  - native review of sv/ja/es/he translations (AI-generated)
  - track school_lead_submitted conversion rate post-fix via PostHog
  - revenue brief thin (rewarded_ad_watched 0/24h vs 7d avg 2 = slow day, not a regression); no ad-side code change needed tonight
  - 3 for-schools FAQ items + meta tweaks (other lane work in working tree) will ship with nightly commit
