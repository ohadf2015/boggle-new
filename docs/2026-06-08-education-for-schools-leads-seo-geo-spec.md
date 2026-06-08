# Spec: "LexiClash for Schools" — education leads + SEO/GEO (2026-06-08)

## Goal
Research-backed move toward: (1) competitive positioning for the education module, (2) SEO + GEO gains, (3) capturing leads that can **actually pay** later (schools/districts). Advisor insight: all three collapse into **one artifact** — a "For Schools" landing page that is simultaneously the commercial-intent SEO page, the GEO-citable moat content, and the qualified lead-capture form.

## Background (from research, this session)
- Education module is **SEO/GEO-mature** (4 EN-indexed landing pages, FAQPage/EducationalOrganization/Course JSON-LD, llms.txt, 23 AI crawlers allowed, hreflang). Marginal gains only there.
- Module is **100% free, zero monetization, zero lead capture** — only a teacher `access request` gate (`teacher_access_requests`).
- Market reality: every competitor monetizes teachers→schools. Kahoot $15-25/teacher/mo schools; Gimkit $650-1000/school/yr; Vocabulary.com $199/classroom; district per-student $2-5/student/yr. Free tiers are artificially capped (Kahoot 40 players, Gimkit 5 students, Wordwall 3 activities).
- **Unowned niches** = our moat: native 5-language incl **Hebrew RTL**, **1v1 duels** (no competitor has), **no student logins**, **Boggle-style word-building** (vs passive MCQ), **genuinely free-forever for teachers**.
- High-value, achievable, commercial-intent keywords currently unowned: "vocabulary game for schools", "classroom word game district", "free word game school license", "1v1 word game classroom", "word game no student login", "Kahoot/Gimkit alternative vocabulary".

## Monetization thesis (honest, free-forever-preserving)
The free classroom experience is **never gated**. We charge schools/districts later for things layered ON TOP that individual teachers don't need:
- District/school **admin dashboard** (multi-class, multi-teacher rollups)
- **Cross-class analytics** (cohort benchmarks, standards alignment, exportable reports)
- **Content libraries** (curated multilingual curriculum word sets)
- **Ad-free school mode** + **SSO** (Clever/ClassLink/Google)

Lead capture is framed as **interest / early-access**, never as gating an existing free feature. Copy must not promise a product that doesn't exist yet.

## Scope — Phase 1 (this work)
A new public page + qualified lead form + storage + GEO update. **Out of scope** (later phases): lead-scoring dashboard, email automation, activation-triggered in-app upsell, the EN "vs Kahoot/Gimkit" comparison page (Phase 2), SSO/admin-dashboard product itself.

### 1. Page: `/[locale]/education/for-schools`
- EN indexed; other locales `robots: { index:false }` + hreflang back to EN — **match the existing `/education/vocabulary-games-classroom` pattern exactly**.
- Sitemap entry (EN, priority ~0.85, weekly).
- Sections: hero → moat value-props (5-lang/RTL, no-login, 1v1+whole-class, free-forever) → "why schools choose LexiClash" lite comparison (free-tier caps + per-student cost of rivals) → "what's coming for schools" (honest early-access framing of admin/analytics/content/ad-free/SSO) → **lead form** → GEO-tuned FAQ.
- Schema: FAQPage JSON-LD + reuse EducationalOrganization; mention school availability. No fake ratings/Offer prices.

### 2. Lead form (qualification fields are load-bearing)
Component `components/education/SchoolLeadForm.tsx`. Fields:
- `full_name` (required, 2-120)
- `email` (required, valid)
- `role` (required: teacher | head_of_department | curriculum_lead | school_admin | district_admin | other)
- `school_or_district` (required, 2-200) — org name
- `student_count` (required bucket: `lt_50` | `50_200` | `200_500` | `500_2000` | `gte_2000`) — **payer-size signal**
- `interests` (multi-select: district_admin_dashboard | analytics | content_libraries | ad_free | sso | pricing_info) — **paying-intent signal**
- `country` (optional, max 80)
- `message` (optional, max 800)
- `locale` (auto)
Submit → success state ("Thanks — we'll be in touch about school features"). Honest framing.

### 3. Storage: new table `school_leads`
Migration under existing migrations dir. Columns: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `email text not null`, `full_name text not null`, `role text not null`, `school_or_district text not null`, `student_count text not null`, `interests text[] not null default '{}'`, `country text`, `message text`, `locale text not null`, `source text not null default 'for-schools-page'`.
- RLS: enable. `anon`/`authenticated` may INSERT (public form). SELECT restricted to admins (service-role / is_admin) only.
- **NOT** added to `supabase_realtime` publication (rule 50-supabase-perf — no consumer).

### 4. Route: `POST /api/education/school-lead` (Next route)
Mirror `/api/education/access-request/route.ts`: client+server validation, rate-limit 3/email/24h → 429, insert via supabase, fire admin email notify (`schoolLeadAdminNotify` template modeled on `teacherAccessAdminNotify`). Returns `{ ok: true }`. Public (no auth). Non-admin `/api/education/*` → no Express body-parse 408 risk (access-request already POSTs fine as a Next route).

### 5. GEO
- Update `public/llms.txt` education section: add the school/moat framing + a query→URL line mapping "vocabulary game for schools / Kahoot alternative for classrooms" → `/en/education/for-schools`.
- Page FAQ authored as direct, citable Q&A (the GEO surface).

### 6. i18n
New namespace `education.forSchools.*` across en/he/sv/ja/es. Lead form labels, options, section copy, FAQ. EN authoritative; others native (use ux-writer principles, no literal MT).

## TDD plan
1. Lead-qualification mapping/validation (pure) — RED→GREEN.
2. Route: valid insert, missing-required → 400, bad email → 400, rate-limit → 429 (mirror access-request test).
3. Form component: required validation, submit calls route, success state.
4. Sitemap includes EN `/education/for-schools`; non-EN noindex metadata.

## Verification
- `npm run lint && test && build`.
- **Browser-verify** (page is PUBLIC, not admin-gated — closes the "shipped unverified" pattern from prior education work): page renders EN, form submits, a row lands in `school_leads`.

## Phase 2 (next, not now)
EN "LexiClash vs Kahoot / vs Gimkit / vs Vocabulary.com for classrooms" comparison page (we only have the Hebrew `lexiclash-vs-wordwall-kahoot-quizlet`). Same SEO+GEO+CTA-to-/for-schools pattern.
