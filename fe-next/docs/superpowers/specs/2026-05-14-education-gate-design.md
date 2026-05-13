# Education Module Access Gate + Teacher Landing — Design

**Date**: 2026-05-14
**Owner**: Education / Growth
**Status**: Approved (brainstorming complete) — handing to writing-plans

---

## Problem

The education module surface (`/education/*`, `/teacher/*`) is currently open to all signed-in users. This conflicts with two goals:

1. **Quality control** — we want vetted teachers using classroom tools, not random visitors clicking around.
2. **Strategic moat** — research (see [Competitor Analysis](#competitor-analysis-summary)) shows the defensible niche is non-English markets + ad-free + locally sourced inventory. To monetize this, we need conversion infra (capture leads, manual approve, build a defensible teacher list).

We also lack a strong sell-page for the education module. Existing `/education` hub is informational, not conversion-focused. We don't talk about our moat. Competitors (Kahoot, Quizlet, Wordwall) have rich teacher sell-pages; we don't.

## Goals

- Gate interactive teacher tools behind email-application + admin manual approval.
- Keep all SEO landings public.
- Build a moat-driven conversion landing at `/education` + a dedicated apply page at `/education/access`.
- Ship admin panel at `/admin/teacher-access` to triage requests.
- Cover all 5 locales (EN/HE/SV/JA/ES) with localized SEO + GEO (AI-search) optimization.

## Non-Goals

- Self-service teacher signup (manual approval is the moat).
- Stripe / paid tier (free for teachers is part of the pitch).
- Student account provisioning (out of scope — teachers handle their own students).
- Migrating existing teacher accounts (none exist outside admin/test users).

---

## Competitor Analysis Summary

(From research done 2026-05-14)

| Platform | Multilingual depth | Ad-free students | Game variety | Brain training | Pricing |
|---|---|---|---|---|---|
| Kahoot! | 50 langs (EN-centric) | No (free tier ads) | Low | No | Freemium $36-228/yr |
| Quizlet | 35 langs | No | Low | No | Freemium $3-4/mo |
| Blooket | EN only | Minimal | High | No | Freemium $36-60/yr |
| Wordwall | 30 langs (untested RTL) | Unknown | Single | No | Freemium $84-200/yr |
| Vocabulary.com | EN only | Yes | Single | Yes | Freemium $9/mo |
| Gimkit | EN only | Unclear | Multiple | No | Freemium $60/yr |

**White-space gaps LexiClash can credibly own**:
1. Native multilingual (Hebrew RTL, Japanese IME, Swedish compounds, Spanish accents) — not translation.
2. Ad-free pledge on education routes — schools in EU/Israel are wary of Kahoot/Quizlet ad tracking.
3. Locally sourced word inventory (Wikipedia per locale + Hebrew Milog) — not US-centric.

**Moat positioning**: *"The word-game platform built for your language — not translated to it. Live multiplayer + brain drills + 6 game modes. Ad-free for students. Free for teachers."*

---

## Architecture

### Data Model

New table `public.teacher_access_requests`:

```sql
create table public.teacher_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  school_or_org text,
  country text,                         -- iso2
  role text not null,                   -- teacher | tutor | admin | parent | researcher | other
  locale text not null default 'en',    -- en | he | sv | ja | es
  use_case text not null,               -- ≤ 800 chars
  status text not null default 'pending', -- pending | approved | declined
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_tar_status on public.teacher_access_requests(status, created_at desc);
create index idx_tar_user on public.teacher_access_requests(user_id) where user_id is not null;
create index idx_tar_email on public.teacher_access_requests(email);
```

**RLS**:
- `anon` and `authenticated` can `INSERT` (rate-limited at API layer to 3 per email per 24h).
- `authenticated` can `SELECT` own row only (`user_id = auth.uid()`).
- Admin (`profiles.is_admin = true`) can `SELECT` and `UPDATE` all.
- No `DELETE` from app — admin uses Supabase MCP if needed.

### Access Grant Flow

1. User submits form on `/education/access` → POST `/api/education/access-request`.
2. API: validate, dedupe (per email within 24h), insert row, send email to `lexiclash.game@gmail.com` via existing contact pipeline, return success.
3. Admin opens `/admin/teacher-access` (must be `is_admin`), reviews queue.
4. Admin clicks Approve → POST `/api/admin/teacher-access/[id]/approve`:
   - Update `teacher_access_requests` status + reviewed_at + reviewed_by.
   - If `user_id` is set, update `profiles.user_role = 'teacher'`.
   - If `user_id` is null (anonymous applicant), store `email` in pending allowlist (`teacher_access_allowlist` table — 1 col `email` text unique). Next time that email signs up, role auto-flips to teacher (handled in existing signup hook).
   - Send confirmation email to applicant.
5. Decline path: update status + admin_note + send polite decline email.

### Gate Behavior

New hook `useTeacherAccess()`:
```ts
{
  hasAccess: boolean,         // profile.user_role in ('teacher','admin')
  status: 'none' | 'pending' | 'approved' | 'declined',
  latestRequest: TeacherAccessRequest | null
}
```

New HOC `<TeacherGate>` wraps gated route PageClients:
- If `hasAccess` → render children.
- Else → redirect to `/education/access?from=<encoded-route>` with toast: "Teacher access required."

**Gated routes**:
- All under `/teacher/*` (5 routes).
- `/education/classroom-game` and `/education/duels` (interactive tools).
- **NOT gated**: `/education` (hub), `/education/access`, `/education/esl-word-games`, `/education/vocabulary-games-classroom`, `/education/games-for-teachers`, `/education/spelling-bee-practice` — all SEO surfaces.

---

## Page Surface

### `/education` (rebuilt master landing)

Sections, top→bottom:
1. **Hero** — H1 moat statement, dual CTA (Request Access + See in action).
2. **Moat trifecta** — 3 cards: native multilingual / locally sourced / ad-free pledge.
3. **6-mode tour** — Classroom Game / Vocabulary Duels / Brain Drills / Daily Wordhunt / Adventure / Spelling Bee. Each card: thumbnail + one-liner + what-it-teaches.
4. **Comparison strip** — table vs Kahoot / Quizlet / Wordwall on native multilingual, ad-free, live MP, brain training, game variety, free for teachers.
5. **Trust block** — privacy claims (no ads, COPPA/GDPR aware, data sovereignty). Note: claims must be backed by actual product behavior; if a claim isn't yet true, leave out rather than overclaim.
6. **FAQ** (8 Q&A, SEO-loaded) — see Section 4 below.
7. **Final CTA** — repeat Request Access + secondary "Try the regular game" link.

### `/education/access` (new — apply form + nudge)

Sections:
1. **Header** — "Apply for free teacher access" + one-line summary.
2. **Form**: full name, email, role (radio: teacher/tutor/admin/parent/researcher/other), school/org (optional), country (select), locale (select, default = current), use-case (textarea, 800 char limit). Submit button.
3. **What happens next** — 3-step explainer (apply → we review → email back, typically <24h).
4. **Pending state** — if user is signed in and already has `status=pending`, hide form, show "Request submitted on [date]. We'll email you at [email]."
5. **Not a teacher? Try LexiClash for fun** — 3 cards linking to `/multiplayer`, `/blast`, `/daily`. Subdued styling, below the form, not above.

### `/admin/teacher-access` (new)

- Counter strip: pending / approved / declined / total.
- Filter bar: status, country, locale, date range.
- Table: name, email, role, school, locale, country, submitted, status.
- Row → drawer: full request details, admin-note textarea, Approve / Decline buttons.
- CSV export button.
- Linked from `/admin` main nav.

### Sub-landings (light touch)

Each of `/education/esl-word-games`, `/education/vocabulary-games-classroom`, `/education/games-for-teachers`, `/education/spelling-bee-practice` gets a new shared `<TeacherAccessCTA />` block (compact card with apply CTA) inserted before the footer.

---

## SEO/GEO Plan

### Structured Data
- `EducationalOrganization` JSON-LD on `/education`.
- `FAQPage` on `/education` (8 Q) + `/education/access` (3 Q on access process).
- `Course` schema on `/education/vocabulary-games-classroom` + `/education/esl-word-games`.
- `BreadcrumbList` on all education routes.
- `speakable` schema (hero + FAQ) for voice/AI assistants.

### Meta + Title (locale-gated per project precedent)

Front-load locale-specific moat keyword in `<title>` and `<meta description>`:

| Locale | Title | Description |
|---|---|---|
| en | LexiClash Education — Classroom Word Games (Free for Teachers) | Free classroom word games — Boggle-style multiplayer for teachers, ad-free for students. EN/HE/SV/JA/ES. |
| he | משחקי מילים לכיתה — חינם למורים \| LexiClash | משחקי מילים מולטיפלייר בעברית, ללא פרסומות לתלמידים. גישת מורה חינם. |
| sv | Klassrumsspel för ord — gratis för lärare \| LexiClash | Ordspel för klassrummet, flerspelarläge på svenska, reklamfritt för elever. |
| ja | 教室向けワードゲーム — 教師は無料 \| LexiClash | 日本語ネイティブ対応の教室向けワードゲーム。生徒向け広告なし。 |
| es | Juegos de palabras para el aula — gratis para profesores \| LexiClash | Juegos de palabras multijugador en español, sin anuncios para alumnos. |

Locale-gate pattern (`isTargetLocale` + `META_FALLBACK`) per project precedent (memory: seo-locale-gate-pattern).

### Keyword Clusters

1. **Non-EN classroom gap**: `Hebrew word games classroom`, `Swedish vocabulary games`, `Japanese word games ESL`, `Spanish classroom word games`.
2. **Ad-free gap**: `ad-free classroom word game`, `no ads vocabulary game students`, `student-safe word game platform`, `COPPA word game`.
3. **Comparison intent**: `alternative to Kahoot for vocabulary`, `Quizlet alternative classroom`, `Wordwall alternative multiplayer`.

### llms.txt
Add `/education` + `/education/access` with: "LexiClash Education — free classroom word games with native multilingual support (Hebrew RTL, Japanese, Swedish, Spanish), ad-free for students, request teacher access by email."

### FAQ Content (8 questions on `/education`)
1. How do teachers get access? (Apply form → manual review → typically <24h email back.)
2. Is it really free for classrooms? (Yes, for verified teachers. No ads on student-facing routes.)
3. Does it work in Hebrew / Japanese / Swedish / Spanish? (Native support, not translation.)
4. COPPA / GDPR / Israeli privacy law compliance? (Stated stance + link to privacy.)
5. Can students use it without an account? (Yes — guest play supported.)
6. How does it differ from Kahoot / Quizlet / Wordwall? (Native multilingual + ad-free + game variety.)
7. Can I track student progress? (Teacher analytics in `/teacher/reports`.)
8. Does it work on Chromebooks / tablets / phones? (Web-first, no install.)

---

## i18n

- New translation namespaces: `education.access.*`, `education.landing.*`, `admin.teacherAccess.*`.
- Estimate: ~80 keys × 5 locales = 400 strings.
- AI-generate HE/SV/JA/ES initial copy; mark native-review-pending in commit message + memory (project precedent).
- Zero hardcoded strings; all via `t(key)`.

---

## Testing (TDD per project policy)

### Unit
- `useTeacherAccess` returns correct shape from various profile states.
- `<TeacherGate>` renders children when access; redirects + toasts otherwise.
- Form validation (email regex, use-case length, required fields).
- Rate-limit guard (3 inserts per email per 24h).

### Integration
- POST `/api/education/access-request` inserts row + sends email + returns 200.
- Duplicate within 24h returns 429.
- POST `/api/admin/teacher-access/[id]/approve` requires admin, flips role, sends email.
- Anonymous applicant approval writes to allowlist; signup hook reads allowlist.

### RLS
- `anon` can insert, cannot select.
- `authenticated` selects own row only.
- `admin` selects/updates all.

### E2E (Playwright)
- Non-teacher → `/teacher/curriculum` → redirected to `/education/access`.
- Apply form → submit → success state.
- Admin approves → user reloads → can access `/teacher/curriculum`.

### Smoke
- 5-locale render of `/education` + `/education/access` (HE RTL pass).
- All gated routes redirect non-teacher.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Form spam | Rate-limit (3 per email per 24h) + honeypot field + optional hCaptcha if abuse |
| Anonymous applicants never sign up | Allowlist row + 90-day TTL cleanup cron; email reminder 7 days after approval |
| Admin queue backlog | Telegram/email digest cron — daily summary of pending count |
| Overclaim "ad-free students" | Verify zero AdMob mounts on all gated + sub-landing routes before launch; document the audit |
| Translation drift on HE/SV/JA/ES | Flag in memory; native review queued (precedent-set pattern) |
| Existing teacher users locked out | Migration script — any existing `user_role='teacher'` keeps access; no opt-in needed |
| `/education` rebuild kills existing SEO | Preserve current URL structure + meta; only enhance, not replace. 301 nothing |

---

## Out of Scope (Explicit)

- Student account provisioning UX.
- Self-service teacher signup.
- Paid / Stripe tier.
- Email reply parsing (admin uses panel; reply via the form audit trail).
- Bulk CSV import of teachers.
- Single-sign-on (Clever / ClassLink / Google for Education).
- LMS integration (Canvas / Schoology / Moodle).
- Public teacher directory.

---

## Implementation Order (For writing-plans Skill)

1. **DB + RLS** — migration via Supabase MCP, allowlist table, RLS policies.
2. **API + email** — POST access-request + approve/decline endpoints + email send.
3. **Hook + Gate HOC** — `useTeacherAccess`, `<TeacherGate>`, wire existing gated routes.
4. **Apply page** — `/education/access` PageClient + form + nudge block.
5. **Admin panel** — `/admin/teacher-access` queue + drawer.
6. **`/education` rebuild** — hero, moat trifecta, 6-mode tour, comparison, FAQ.
7. **Sub-landings CTA** — shared `<TeacherAccessCTA />` block on 4 SEO landings.
8. **SEO/GEO** — JSON-LD blocks, meta-rewrites per locale, llms.txt, sitemap touch.
9. **i18n** — 5-locale string drops.
10. **Tests** — unit + integration + E2E + smoke.

Each phase = one TDD cycle + one commit.
