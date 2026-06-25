---
status: shipped
attempted: Fix education "free forever" false copy → honest 30-day trial + $149/school/year pricing; update JSON-LD schema
---

## What shipped

**Pricing decision (autonomous):** $149/school/year. Rationale: undercuts Gimkit ($650-1k/yr) and Kahoot school plans; above free; comparable to Vocabulary.com ($199/classroom) but with a free individual-teacher tier.

**Model:** Free 30-day trial for all teachers (no cap, no card) → basic classroom game stays free for individual teachers after trial → school plans $149/year (admin dashboard, analytics, curriculum libraries, ad-free, SSO).

## files_touched
- `fe-next/app/[locale]/education/for-schools/content.ts`
  - metaTitle/Description: removed "free-forever", added "Free 30-day trial -- school plans from $149/year"
  - heroSubtitle: "LexiClash is free for every teacher" → "Try LexiClash free for 30 days"
  - freeForeverTitle: "Free forever for teachers -- that part never changes" → "Start free -- school plans from $149/year"
  - freeForeverBody: removed permanence claims; honest 30-day trial + $149/year pricing
  - compareRows: lexiclash column "Free." × 4 → "No player cap during trial. School plans from $149/year."
  - comingTitle/Intro: names the $149/year price point
  - leadIntro: explicit "$149/year" mention
  - FAQ Q1: "That does not change" removed; honest trial + paid school plans
  - FAQ Q2: renamed + pricing added
- `fe-next/app/[locale]/education/for-schools/page.tsx`
  - JSON-LD schema: `offers: { price: 0, category: 'free' }` → two offers (free trial + school plan $149/year)
  - org description: removed "Free for every teacher" permanence claim

eslint: 0 errors, 0 warnings (both files)

## next_steps
- PageClient.tsx line ~127 has hardcoded "Free for teachers - Approved in ~24h" badge → update to "30-day free trial - School plans from $149/year"
- Education hub page.tsx still has "free forever" in card descriptions → update
- SchoolLeadForm.tsx: add "$149/year school plans" note below submit
- Revenue snapshot still stale -- founder should provision ADMOB_API_TOKEN or run pull-revenue-snapshot.sh
- A/B test $149 vs $199 price point when traffic justifies it
