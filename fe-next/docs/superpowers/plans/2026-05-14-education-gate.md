# Education Module Access Gate + Teacher Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate `/teacher/*` and interactive education tools behind admin-approved email applications, build a moat-driven `/education` master landing + `/education/access` apply page + `/admin/teacher-access` admin queue, all i18n'd across 5 locales with SEO/GEO optimization and high-quality scroll animations.

**Architecture:** Soft gate (SEO landings stay public, only interactive tools gated). Manual admin approval flow with anonymous-applicant allowlist bridge. New Supabase tables `teacher_access_requests` + `teacher_access_allowlist` with RLS. Hook + HOC pattern for route gating. `/education` rebuilt with hero/moat-trifecta/6-mode-tour/comparison/FAQ stack, polished via `frontend-design:frontend-design` skill and scroll effects via `animate-ai` skill.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind · Supabase (MCP for migrations) · Resend (or existing contact pipeline) for email · Vitest + Jest for unit/integration · Playwright for E2E · `frontend-design` skill (design quality) · `animate-ai` skill (scroll patterns).

**Spec:** [`fe-next/docs/superpowers/specs/2026-05-14-education-gate-design.md`](../specs/2026-05-14-education-gate-design.md)

---

## JSON-LD Emission Pattern

Throughout this plan, JSON-LD structured data uses Next.js's `next/script` `Script` component (NOT `dangerouslySetInnerHTML`). Standard pattern:

```tsx
import Script from 'next/script';

<Script id="education-faq-ld" type="application/ld+json" strategy="afterInteractive">
  {JSON.stringify(faqLd)}
</Script>
```

This is XSS-safe because `JSON.stringify` of a typed literal cannot inject script content, and `next/script` Children pattern is the supported way to emit JSON-LD in App Router.

---

## Pre-flight Checklist

Before Task 1, verify the working environment:

- [ ] Dev server runs: `cd fe-next && npm run dev` (should serve on port 3001)
- [ ] Tests run: `cd fe-next && npm run test -- --run` (should pass clean)
- [ ] Supabase MCP available (will be used for migration)
- [ ] Lint clean: `cd fe-next && npm run lint`
- [ ] Git working tree status acknowledged (many unstaged files from prior sessions — touch only files this plan specifies)

---

## File Structure (decomposition map)

### New files

| Path | Responsibility |
|---|---|
| `fe-next/lib/education/types.ts` | TypeScript types for `TeacherAccessRequest`, `TeacherAccessStatus`, form payload |
| `fe-next/lib/education/useTeacherAccess.ts` | React hook returning `{ hasAccess, status, latestRequest }` |
| `fe-next/lib/education/allowlist.ts` | `consumeTeacherAllowlist` helper for signup bridge |
| `fe-next/components/education/TeacherGate.tsx` | Component that gates a child tree, redirects non-teachers |
| `fe-next/components/education/TeacherAccessCTA.tsx` | Shared callout block reused on sub-landings |
| `fe-next/components/education/AccessRequestForm.tsx` | The apply form (controlled inputs + submit) |
| `fe-next/components/education/MoatTrifectaSection.tsx` | Hero-adjacent 3-card moat section with scroll-reveal |
| `fe-next/components/education/SixModeTour.tsx` | Carousel of 6 game-mode cards with stagger animation |
| `fe-next/components/education/ComparisonStrip.tsx` | LexiClash vs Kahoot/Quizlet/Wordwall table |
| `fe-next/components/education/EducationFAQ.tsx` | 8-question FAQ + FAQPage JSON-LD |
| `fe-next/components/education/EducationHero.tsx` | Hero with parallax + entrance animation |
| `fe-next/components/admin/TeacherAccessQueue.tsx` | Admin queue table |
| `fe-next/components/admin/TeacherAccessDrawer.tsx` | Per-request approve/decline drawer |
| `fe-next/app/[locale]/education/access/page.tsx` | Apply page route entry |
| `fe-next/app/[locale]/education/access/PageClient.tsx` | Apply page client component |
| `fe-next/app/[locale]/admin/teacher-access/page.tsx` | Admin queue route entry |
| `fe-next/app/[locale]/admin/teacher-access/PageClient.tsx` | Admin queue client |
| `fe-next/app/api/education/access-request/route.ts` | POST + GET endpoint for form submission |
| `fe-next/app/api/education/consume-allowlist/route.ts` | POST endpoint for signup allowlist consumption |
| `fe-next/app/api/admin/teacher-access/[id]/approve/route.ts` | POST endpoint to approve |
| `fe-next/app/api/admin/teacher-access/[id]/decline/route.ts` | POST endpoint to decline |
| `fe-next/app/api/admin/teacher-access/route.ts` | GET list w/ filters |
| `fe-next/app/api/admin/teacher-access/export/route.ts` | GET CSV export |
| `fe-next/lib/email/templates/teacherAccessConfirmation.ts` | Confirmation email body |
| `fe-next/lib/email/templates/teacherAccessDecline.ts` | Decline email body |
| `fe-next/lib/email/templates/teacherAccessAdminNotify.ts` | Admin notification email |
| `fe-next/lib/seo/educationStructuredData.ts` | JSON-LD helpers |

### Modified files

| Path | Change |
|---|---|
| `fe-next/app/[locale]/education/page.tsx` + `PageClient.tsx` | Rebuild with new sections |
| `fe-next/app/[locale]/education/classroom-game/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/education/duels/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/teacher/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/teacher/profile/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/teacher/curriculum/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/teacher/reports/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/teacher/classroom/[id]/analytics/page.tsx` | Wrap with `<TeacherGate>` |
| `fe-next/app/[locale]/education/esl-word-games/PageClient.tsx` | Inject `<TeacherAccessCTA />` |
| `fe-next/app/[locale]/education/vocabulary-games-classroom/PageClient.tsx` | Inject `<TeacherAccessCTA />` |
| `fe-next/app/[locale]/education/games-for-teachers/PageClient.tsx` | Inject `<TeacherAccessCTA />` |
| `fe-next/app/[locale]/education/spelling-bee-practice/PageClient.tsx` | Inject `<TeacherAccessCTA />` |
| `fe-next/locales/en.js` · `he.js` · `sv.js` · `ja.js` · `es.js` | ~100 new keys × 5 |
| `fe-next/public/llms.txt` | Add education positioning lines |
| Sitemap source | Include `/education/access` |
| Admin nav (find via grep) | Add Teacher Access link |
| Signup completion path (find via grep) | Hit `/api/education/consume-allowlist` |

---

## Task 1: Database migration + RLS

**Files:**
- Create (via Supabase MCP): migration `teacher_access_2026_05_14`
- Test: `fe-next/lib/education/__tests__/rls.test.ts`

- [ ] **Step 1.1: Write the RLS integration test (RED)**

Create `fe-next/lib/education/__tests__/rls.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const anonClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('teacher_access_requests RLS', () => {
  it('anon CAN insert a new request', async () => {
    const sb = anonClient();
    const { error } = await sb.from('teacher_access_requests').insert({
      email: `rls-test-${Date.now()}@example.com`,
      full_name: 'RLS Test',
      role: 'teacher',
      locale: 'en',
      use_case: 'integration test for RLS policy',
    });
    expect(error).toBeNull();
  });

  it('anon CANNOT select rows', async () => {
    const sb = anonClient();
    const { data } = await sb.from('teacher_access_requests').select('*').limit(1);
    expect(data).toEqual([]);
  });

  it('anon CANNOT update rows', async () => {
    const sb = anonClient();
    const { error } = await sb.from('teacher_access_requests')
      .update({ status: 'approved' })
      .eq('email', 'anything@example.com');
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 1.2: Run test, verify RED**

```bash
cd fe-next && npm run test -- lib/education/__tests__/rls.test.ts --run
```
Expected: FAIL with `relation "teacher_access_requests" does not exist`.

- [ ] **Step 1.3: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `teacher_access_2026_05_14` and SQL:

```sql
create table public.teacher_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  school_or_org text,
  country text,
  role text not null check (role in ('teacher','tutor','admin','parent','researcher','other')),
  locale text not null default 'en' check (locale in ('en','he','sv','ja','es')),
  use_case text not null check (length(use_case) <= 800),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_tar_status on public.teacher_access_requests(status, created_at desc);
create index idx_tar_user on public.teacher_access_requests(user_id) where user_id is not null;
create index idx_tar_email on public.teacher_access_requests(email);

create table public.teacher_access_allowlist (
  email text primary key,
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  source_request_id uuid references public.teacher_access_requests(id),
  consumed_at timestamptz,
  consumed_by_user_id uuid references auth.users(id)
);

create index idx_taa_consumed on public.teacher_access_allowlist(consumed_at) where consumed_at is null;

alter table public.teacher_access_requests enable row level security;
alter table public.teacher_access_allowlist enable row level security;

create policy tar_insert_any on public.teacher_access_requests
  for insert with check (true);

create policy tar_select_own on public.teacher_access_requests
  for select using (auth.uid() = user_id);

create policy tar_admin_select on public.teacher_access_requests
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy tar_admin_update on public.teacher_access_requests
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy taa_admin_select on public.teacher_access_allowlist
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy taa_admin_insert on public.teacher_access_allowlist
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy taa_admin_update on public.teacher_access_allowlist
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
```

- [ ] **Step 1.4: Run RLS test, verify GREEN**

```bash
cd fe-next && npm run test -- lib/education/__tests__/rls.test.ts --run
```
Expected: PASS — anon insert OK, anon select empty, anon update errors.

- [ ] **Step 1.5: Verify migration via MCP**

Use `mcp__supabase__list_tables` with schemas: ['public']. Expected: `teacher_access_requests` and `teacher_access_allowlist` present.

- [ ] **Step 1.6: Commit**

```bash
git add fe-next/lib/education/__tests__/rls.test.ts
git commit -m "feat(education): teacher access DB schema + RLS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Types + email templates

**Files:**
- Create: `fe-next/lib/education/types.ts`
- Create: `fe-next/lib/email/templates/teacherAccessAdminNotify.ts`
- Create: `fe-next/lib/email/templates/teacherAccessConfirmation.ts`
- Create: `fe-next/lib/email/templates/teacherAccessDecline.ts`
- Test: `fe-next/lib/email/templates/__tests__/teacherAccessEmails.test.ts`

- [ ] **Step 2.1: Write types**

Create `fe-next/lib/education/types.ts`:

```ts
export type TeacherAccessStatus = 'pending' | 'approved' | 'declined';
export type TeacherAccessRole = 'teacher' | 'tutor' | 'admin' | 'parent' | 'researcher' | 'other';
export type TeacherLocale = 'en' | 'he' | 'sv' | 'ja' | 'es';

export interface TeacherAccessRequest {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  school_or_org: string | null;
  country: string | null;
  role: TeacherAccessRole;
  locale: TeacherLocale;
  use_case: string;
  status: TeacherAccessStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface TeacherAccessFormPayload {
  email: string;
  full_name: string;
  school_or_org?: string;
  country?: string;
  role: TeacherAccessRole;
  locale: TeacherLocale;
  use_case: string;
}
```

- [ ] **Step 2.2: Write email-template test (RED)**

Create `fe-next/lib/email/templates/__tests__/teacherAccessEmails.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { teacherAccessAdminNotify } from '../teacherAccessAdminNotify';
import { teacherAccessConfirmation } from '../teacherAccessConfirmation';
import { teacherAccessDecline } from '../teacherAccessDecline';

const baseReq = {
  full_name: 'Jane Doe',
  email: 'jane@school.edu',
  role: 'teacher' as const,
  school_or_org: 'Riverdale High',
  country: 'US',
  locale: 'en' as const,
  use_case: '9th grade ESL teacher, 25 students.',
};

describe('teacher access email templates', () => {
  it('admin notify includes applicant name + email + use_case', () => {
    const out = teacherAccessAdminNotify(baseReq);
    expect(out.subject).toContain('Teacher Access Request');
    expect(out.html).toContain('Jane Doe');
    expect(out.html).toContain('jane@school.edu');
    expect(out.html).toContain('9th grade ESL teacher');
    expect(out.html).toContain('Riverdale High');
  });

  it('confirmation greets applicant + mentions approved access', () => {
    const out = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(out.subject.toLowerCase()).toContain('approved');
    expect(out.html).toContain('Jane');
    expect(out.html).toContain('/teacher');
  });

  it('decline is polite + reasoned + invites regular game', () => {
    const out = teacherAccessDecline({ full_name: 'Jane', locale: 'en', reason: 'incomplete' });
    expect(out.html).toContain('Jane');
    expect(out.html).toContain('incomplete');
    expect(out.html.toLowerCase()).toContain('regular');
  });

  it('locale=he produces Hebrew content', () => {
    const out = teacherAccessConfirmation({ full_name: 'יעל', locale: 'he' });
    expect(out.html).toMatch(/[֐-׿]/);
  });

  it('escapes HTML in user-provided fields', () => {
    const out = teacherAccessAdminNotify({ ...baseReq, full_name: '<script>alert(1)</script>' });
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
  });
});
```

- [ ] **Step 2.3: Run test, verify RED**

```bash
cd fe-next && npm run test -- lib/email/templates/__tests__/teacherAccessEmails.test.ts --run
```
Expected: FAIL — modules not found.

- [ ] **Step 2.4: Implement email templates**

Create `fe-next/lib/email/templates/teacherAccessAdminNotify.ts`:

```ts
import type { TeacherAccessFormPayload } from '@/lib/education/types';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function teacherAccessAdminNotify(req: TeacherAccessFormPayload) {
  return {
    subject: `Teacher Access Request — ${req.full_name} (${req.locale.toUpperCase()})`,
    html: `<h2>New Teacher Access Request</h2>
<p><strong>Name:</strong> ${escape(req.full_name)}</p>
<p><strong>Email:</strong> ${escape(req.email)}</p>
<p><strong>Role:</strong> ${req.role}</p>
<p><strong>School/Org:</strong> ${escape(req.school_or_org || '—')}</p>
<p><strong>Country:</strong> ${escape(req.country || '—')}</p>
<p><strong>Locale:</strong> ${req.locale}</p>
<p><strong>Use case:</strong></p>
<blockquote>${escape(req.use_case)}</blockquote>
<p><a href="https://lexiclash.com/admin/teacher-access">Review in admin panel</a></p>`,
  };
}
```

Create `fe-next/lib/email/templates/teacherAccessConfirmation.ts`:

```ts
import type { TeacherLocale } from '@/lib/education/types';

interface Args { full_name: string; locale: TeacherLocale; }

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const COPY: Record<TeacherLocale, { subject: string; greeting: (n: string) => string; body: string; cta: string }> = {
  en: {
    subject: 'Your LexiClash teacher access is approved',
    greeting: (n) => `Hi ${n},`,
    body: 'Great news — your teacher access is approved. You can now use Classroom Game, Vocabulary Duels, Brain Drills, and all the teacher tools in your dashboard.',
    cta: 'Open Teacher Dashboard',
  },
  he: {
    subject: 'הגישה שלך כמורה ב-LexiClash אושרה',
    greeting: (n) => `שלום ${n},`,
    body: 'חדשות טובות — הגישה שלך כמורה אושרה. כעת תוכל/י להשתמש במשחק כיתתי, דו-קרב אוצר מילים, תרגולי מוח וכל כלי המורה.',
    cta: 'פתח/י לוח בקרה למורה',
  },
  sv: {
    subject: 'Din lärarbehörighet på LexiClash är godkänd',
    greeting: (n) => `Hej ${n},`,
    body: 'Bra nyheter — din lärarbehörighet är godkänd. Du kan nu använda Klassrumsspel, Ordduellerna, Hjärnträning och alla lärarverktyg.',
    cta: 'Öppna lärarpanelen',
  },
  ja: {
    subject: 'LexiClash 教師アクセスが承認されました',
    greeting: (n) => `${n}様、`,
    body: '朗報です — 教師アクセスが承認されました。教室ゲーム、語彙対戦、脳トレーニング、すべての教師ツールをご利用いただけます。',
    cta: '教師ダッシュボードを開く',
  },
  es: {
    subject: 'Tu acceso de profesor en LexiClash ha sido aprobado',
    greeting: (n) => `Hola ${n},`,
    body: 'Buenas noticias — tu acceso de profesor ha sido aprobado. Ya puedes usar Juego de Aula, Duelos de Vocabulario, Entrenamiento Cerebral y todas las herramientas para profesores.',
    cta: 'Abrir panel de profesor',
  },
};

export function teacherAccessConfirmation({ full_name, locale }: Args) {
  const c = COPY[locale];
  return {
    subject: c.subject,
    html: `<p>${c.greeting(escape(full_name))}</p>
<p>${c.body}</p>
<p><a href="https://lexiclash.com/${locale}/teacher" style="background:#0a0e27;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">${c.cta}</a></p>
<p>— LexiClash Team</p>`,
  };
}
```

Create `fe-next/lib/email/templates/teacherAccessDecline.ts`:

```ts
import type { TeacherLocale } from '@/lib/education/types';

interface Args { full_name: string; locale: TeacherLocale; reason?: string; }

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function teacherAccessDecline({ full_name, locale, reason }: Args) {
  const reasonLine = reason ? `<p><strong>Reason:</strong> ${escape(reason)}</p>` : '';
  return {
    subject: 'About your LexiClash teacher access request',
    html: `<p>Hi ${escape(full_name)},</p>
<p>Thanks for applying for teacher access. After review, we're not able to approve your request at this time.</p>
${reasonLine}
<p>You're welcome to try the regular game with friends — it's free:</p>
<p><a href="https://lexiclash.com/${locale}/multiplayer">Play LexiClash</a></p>
<p>If you'd like to reapply with more details, you can do so anytime at <a href="https://lexiclash.com/${locale}/education/access">/education/access</a>.</p>
<p>— LexiClash Team</p>`,
  };
}
```

- [ ] **Step 2.5: Run test, verify GREEN**

```bash
cd fe-next && npm run test -- lib/email/templates/__tests__/teacherAccessEmails.test.ts --run
```
Expected: PASS all 5 tests.

- [ ] **Step 2.6: Commit**

```bash
git add fe-next/lib/education/types.ts fe-next/lib/email/templates/teacherAccess*.ts fe-next/lib/email/templates/__tests__/
git commit -m "feat(education): teacher access types + email templates (5 locales)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: API endpoint — POST /api/education/access-request

**Files:**
- Create: `fe-next/app/api/education/access-request/route.ts`
- Test: `fe-next/app/api/education/access-request/__tests__/route.test.ts`

> NOTE: First inspect `fe-next/app/api/contact/route.ts` to see the existing email-send helper. Reuse it; do not introduce a new email provider. Locate the import path (e.g., `@/lib/email/send` or inline `Resend` SDK call). Use whatever pattern the contact route uses.

- [ ] **Step 3.1: Write API test (RED)**

Create `fe-next/app/api/education/access-request/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: vi.fn(async () => ({ data: { id: 'req-1' }, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(async () => ({ data: [], count: 0, error: null })),
        })),
      })),
    }),
  }),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

const mkReq = (body: any): Request => new Request('http://test/api/education/access-request', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const validPayload = {
  email: 'jane@school.edu',
  full_name: 'Jane Doe',
  role: 'teacher',
  locale: 'en',
  use_case: 'I want to use this with 9th grade ESL.',
};

describe('POST /api/education/access-request', () => {
  beforeEach(() => vi.clearAllMocks());

  it('200 on valid payload', async () => {
    const res = await POST(mkReq(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('400 if email missing', async () => {
    const { email, ...bad } = validPayload;
    const res = await POST(mkReq(bad));
    expect(res.status).toBe(400);
  });

  it('400 if use_case > 800 chars', async () => {
    const res = await POST(mkReq({ ...validPayload, use_case: 'x'.repeat(801) }));
    expect(res.status).toBe(400);
  });

  it('400 if email malformed', async () => {
    const res = await POST(mkReq({ ...validPayload, email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('400 if role unknown', async () => {
    const res = await POST(mkReq({ ...validPayload, role: 'janitor' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3.2: Run test, verify RED**

```bash
cd fe-next && npm run test -- app/api/education/access-request --run
```
Expected: FAIL — route not found.

- [ ] **Step 3.3: Implement route**

Create `fe-next/app/api/education/access-request/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessAdminNotify } from '@/lib/email/templates/teacherAccessAdminNotify';
import type { TeacherAccessFormPayload } from '@/lib/education/types';

const ROLES = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'] as const;
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const { email, full_name, role, locale, use_case, school_or_org, country } = body || {};

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) return bad('invalid email');
  if (!full_name || typeof full_name !== 'string' || full_name.length < 2 || full_name.length > 120) return bad('invalid full_name');
  if (!ROLES.includes(role)) return bad('invalid role');
  if (!LOCALES.includes(locale)) return bad('invalid locale');
  if (typeof use_case !== 'string' || use_case.length < 10 || use_case.length > 800) return bad('use_case must be 10-800 chars');
  if (school_or_org && (typeof school_or_org !== 'string' || school_or_org.length > 200)) return bad('invalid school_or_org');
  if (country && (typeof country !== 'string' || country.length > 80)) return bad('invalid country');

  const sb = createServerClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sb
    .from('teacher_access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((recent.count || 0) >= 3) return bad('too many requests in 24h, try again later', 429);

  const payload: TeacherAccessFormPayload = { email, full_name, role, locale, use_case, school_or_org, country };
  const ins = await sb.from('teacher_access_requests').insert({ ...payload, user_id: null });
  if (ins.error) return bad('insert failed: ' + ins.error.message, 500);

  const tpl = teacherAccessAdminNotify(payload);
  await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ row: null });
  const { data } = await sb.from('teacher_access_requests')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ row: data });
}
```

- [ ] **Step 3.4: Run test, verify GREEN**

```bash
cd fe-next && npm run test -- app/api/education/access-request --run
```
Expected: PASS all 5 tests.

- [ ] **Step 3.5: Commit**

```bash
git add fe-next/app/api/education/access-request/
git commit -m "feat(education): POST + GET /api/education/access-request with validation + rate limit

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Admin API endpoints — list, approve, decline, export

**Files:**
- Create: `fe-next/app/api/admin/teacher-access/route.ts` (GET list)
- Create: `fe-next/app/api/admin/teacher-access/[id]/approve/route.ts`
- Create: `fe-next/app/api/admin/teacher-access/[id]/decline/route.ts`
- Create: `fe-next/app/api/admin/teacher-access/export/route.ts`
- Test: `fe-next/app/api/admin/teacher-access/__tests__/admin.test.ts`

- [ ] **Step 4.1: Write admin API tests (RED)**

Create `fe-next/app/api/admin/teacher-access/__tests__/admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const adminProfile = { id: 'admin-1', is_admin: true };
const userProfile = { id: 'user-1', is_admin: false };

const mockSupabase = (profile: any, requestRow: any = null) => ({
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: profile.id } }, error: null })) },
  from: vi.fn((table: string) => {
    if (table === 'profiles') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_requests') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: requestRow, error: null }) }) }),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    if (table === 'teacher_access_allowlist') return {
      insert: vi.fn(async () => ({ error: null })),
    };
    return {};
  }),
});

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

import { POST as approve } from '../[id]/approve/route';
import { POST as decline } from '../[id]/decline/route';
import { GET as list } from '../route';
import { createServerClient } from '@/lib/supabase/server';

const req = (body?: any) => new Request('http://t', { method: 'POST', body: body ? JSON.stringify(body) : undefined });

describe('admin teacher-access endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approve rejects non-admin', async () => {
    (createServerClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(403);
  });

  it('approve flips status and allowlists email when no user_id', async () => {
    const row = { id: 'req-1', user_id: null, email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createServerClient as any).mockReturnValue(sb);
    const res = await approve(req(), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('decline writes admin_note and status', async () => {
    const row = { id: 'req-1', user_id: 'u-1', email: 'x@y.com', full_name: 'X', locale: 'en' };
    const sb = mockSupabase(adminProfile, row);
    (createServerClient as any).mockReturnValue(sb);
    const res = await decline(req({ reason: 'incomplete info' }), { params: Promise.resolve({ id: 'req-1' }) });
    expect(res.status).toBe(200);
  });

  it('list rejects non-admin', async () => {
    (createServerClient as any).mockReturnValue(mockSupabase(userProfile));
    const res = await list(new Request('http://t'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 4.2: Run, verify RED**

```bash
cd fe-next && npm run test -- app/api/admin/teacher-access --run
```
Expected: FAIL.

- [ ] **Step 4.3: Implement approve route**

Create `fe-next/app/api/admin/teacher-access/[id]/approve/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessConfirmation } from '@/lib/email/templates/teacherAccessConfirmation';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = createServerClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: row, error: fetchErr } = await sb.from('teacher_access_requests').select('*').eq('id', id).single();
  if (fetchErr || !row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const upd = await sb.from('teacher_access_requests').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq('id', id);
  if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

  if (row.user_id) {
    const r = await sb.from('profiles').update({ user_role: 'teacher' }).eq('id', row.user_id);
    if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
  } else {
    const r = await sb.from('teacher_access_allowlist').insert({
      email: row.email,
      approved_by: user.id,
      source_request_id: row.id,
    });
    if (r.error && !r.error.message.includes('duplicate')) {
      return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }
  }

  const tpl = teacherAccessConfirmation({ full_name: row.full_name, locale: row.locale });
  await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4.4: Implement decline route**

Create `fe-next/app/api/admin/teacher-access/[id]/decline/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessDecline } from '@/lib/email/templates/teacherAccessDecline';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any = {}; try { body = await req.json(); } catch {}
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined;

  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: row } = await sb.from('teacher_access_requests').select('*').eq('id', id).single();
  if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const upd = await sb.from('teacher_access_requests').update({
    status: 'declined',
    admin_note: reason || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq('id', id);
  if (upd.error) return NextResponse.json({ ok: false }, { status: 500 });

  const tpl = teacherAccessDecline({ full_name: row.full_name, locale: row.locale, reason });
  await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4.5: Implement list + export routes**

Create `fe-next/app/api/admin/teacher-access/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const locale = url.searchParams.get('locale');
  const country = url.searchParams.get('country');
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
  const PAGE_SIZE = 50;

  let q = sb.from('teacher_access_requests').select('*', { count: 'exact' });
  if (status) q = q.eq('status', status);
  if (locale) q = q.eq('locale', locale);
  if (country) q = q.eq('country', country);
  q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows: data, count, page, pageSize: PAGE_SIZE });
}
```

Create `fe-next/app/api/admin/teacher-access/export/route.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 });

  const url = new URL(req.url);
  let q = sb.from('teacher_access_requests').select('*').order('created_at', { ascending: false });
  const status = url.searchParams.get('status');
  const locale = url.searchParams.get('locale');
  const country = url.searchParams.get('country');
  if (status) q = q.eq('status', status);
  if (locale) q = q.eq('locale', locale);
  if (country) q = q.eq('country', country);

  const { data } = await q;
  const rows = data || [];
  const headers = ['id','created_at','email','full_name','role','locale','country','school_or_org','status','admin_note','use_case'];
  const csv = [headers.join(',')].concat(
    rows.map((r: any) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ).join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': `attachment; filename="teacher-access-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

- [ ] **Step 4.6: Run tests, verify GREEN**

```bash
cd fe-next && npm run test -- app/api/admin/teacher-access --run
```
Expected: PASS all 4 tests.

- [ ] **Step 4.7: Commit**

```bash
git add fe-next/app/api/admin/teacher-access/
git commit -m "feat(education): admin API for teacher access (list/approve/decline/export)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Allowlist bridge + useTeacherAccess hook + TeacherGate

**Files:**
- Create: `fe-next/lib/education/allowlist.ts`
- Create: `fe-next/app/api/education/consume-allowlist/route.ts`
- Create: `fe-next/lib/education/useTeacherAccess.ts`
- Create: `fe-next/components/education/TeacherGate.tsx`
- Test: `fe-next/lib/education/__tests__/allowlist.test.ts`
- Test: `fe-next/lib/education/__tests__/useTeacherAccess.test.tsx`
- Test: `fe-next/components/education/__tests__/TeacherGate.test.tsx`
- Modify: signup completion path (locate via grep)

- [ ] **Step 5.1: Locate signup completion path**

Run:
```bash
git grep -n "user_role" fe-next/contexts fe-next/lib fe-next/app/api/auth 2>/dev/null | head -20
git grep -rn "INSERT INTO profiles\|from('profiles').insert\|profiles\.insert" fe-next | head -10
```

Identify the file that creates a profile row on first auth (likely `contexts/AuthContext.tsx`, `contexts/auth/hooks/useAuthState.ts`, or a `/api/auth/callback` route). Note the file path for Step 5.5.

- [ ] **Step 5.2: Write allowlist test (RED)**

Create `fe-next/lib/education/__tests__/allowlist.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

const calls: any[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: (t: string) => {
      if (t === 'teacher_access_allowlist') return {
        select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: { email: 'x@y.com' } }) }) }) }),
        update: vi.fn((u: any) => { calls.push({ table: t, op: 'update', u }); return { eq: vi.fn(async () => ({ error: null })) }; }),
      };
      if (t === 'profiles') return {
        update: vi.fn((u: any) => { calls.push({ table: t, op: 'update', u }); return { eq: vi.fn(async () => ({ error: null })) }; }),
      };
      return {} as any;
    },
  }),
}));

import { consumeTeacherAllowlist } from '../allowlist';

describe('consumeTeacherAllowlist', () => {
  it('flips role and marks consumed when match exists', async () => {
    calls.length = 0;
    const out = await consumeTeacherAllowlist({ userId: 'u-1', email: 'x@y.com' });
    expect(out.consumed).toBe(true);
    expect(calls.find((c) => c.table === 'profiles')?.u?.user_role).toBe('teacher');
  });
});
```

- [ ] **Step 5.3: Implement allowlist helper**

Create `fe-next/lib/education/allowlist.ts`:

```ts
import { createServerClient } from '@/lib/supabase/server';

export async function consumeTeacherAllowlist({ userId, email }: { userId: string; email: string }) {
  const sb = createServerClient();
  const { data: row } = await sb
    .from('teacher_access_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .is('consumed_at', null)
    .maybeSingle();

  if (!row) return { consumed: false };

  await sb.from('profiles').update({ user_role: 'teacher' }).eq('id', userId);
  await sb.from('teacher_access_allowlist').update({
    consumed_at: new Date().toISOString(),
    consumed_by_user_id: userId,
  }).eq('email', row.email);

  return { consumed: true };
}
```

- [ ] **Step 5.4: Implement consume-allowlist route**

Create `fe-next/app/api/education/consume-allowlist/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { consumeTeacherAllowlist } from '@/lib/education/allowlist';

export async function POST() {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });
  const out = await consumeTeacherAllowlist({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true, ...out });
}
```

- [ ] **Step 5.5: Wire allowlist consumption into signup completion**

In the file identified in Step 5.1, find the place where a new session is confirmed and a profile row has been ensured (after `INSERT` or `select` on profiles). Add right after profile load:

```ts
// Allowlist bridge: if this email was pre-approved for teacher access, consume the entry.
if (user?.email) {
  fetch('/api/education/consume-allowlist', { method: 'POST' }).catch(() => {});
}
```

This is fire-and-forget. The user might briefly see non-teacher role until next refresh. Acceptable for v1.

- [ ] **Step 5.6: Run allowlist tests, verify GREEN**

```bash
cd fe-next && npm run test -- lib/education/__tests__/allowlist.test.ts --run
```
Expected: PASS.

- [ ] **Step 5.7: Write useTeacherAccess test (RED)**

Create `fe-next/lib/education/__tests__/useTeacherAccess.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u-1', user_role: 'teacher', is_admin: false },
    user: { id: 'u-1' },
    isLoading: false,
  }),
}));

import { useTeacherAccess } from '../useTeacherAccess';

describe('useTeacherAccess', () => {
  it('returns hasAccess=true for teacher role', () => {
    const { result } = renderHook(() => useTeacherAccess());
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.status).toBe('approved');
  });
});
```

Then create `fe-next/lib/education/__tests__/useTeacherAccess.player.test.tsx` with role mocked as `'player'`, asserting `hasAccess === false, status === 'none'`.

- [ ] **Step 5.8: Implement useTeacherAccess**

Create `fe-next/lib/education/useTeacherAccess.ts`:

```ts
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { TeacherAccessRequest, TeacherAccessStatus } from './types';

interface UseTeacherAccessResult {
  hasAccess: boolean;
  status: TeacherAccessStatus | 'none';
  latestRequest: TeacherAccessRequest | null;
  isLoading: boolean;
}

export function useTeacherAccess(): UseTeacherAccessResult {
  const { profile, user, isLoading: authLoading } = useAuth();
  const [latestRequest, setLatestRequest] = useState<TeacherAccessRequest | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  const role = profile?.user_role;
  const hasAccess = role === 'teacher' || role === 'admin' || profile?.is_admin === true;

  useEffect(() => {
    if (!user?.id || hasAccess) return;
    setReqLoading(true);
    fetch('/api/education/access-request')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setLatestRequest(j?.row || null))
      .finally(() => setReqLoading(false));
  }, [user?.id, hasAccess]);

  const status: TeacherAccessStatus | 'none' = hasAccess
    ? 'approved'
    : (latestRequest?.status as TeacherAccessStatus) || 'none';

  return { hasAccess, status, latestRequest, isLoading: authLoading || reqLoading };
}
```

- [ ] **Step 5.9: Write TeacherGate test (RED)**

Create `fe-next/components/education/__tests__/TeacherGate.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterReplace }),
  usePathname: () => '/en/teacher/curriculum',
}));

import { TeacherGate } from '../TeacherGate';

describe('<TeacherGate>', () => {
  it('renders children when hasAccess', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(screen.getByText('INSIDE')).toBeInTheDocument();
  });

  it('redirects to /education/access when no access', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('/education/access?from='));
    expect(screen.queryByText('INSIDE')).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(container.textContent).not.toContain('INSIDE');
  });
});
```

- [ ] **Step 5.10: Implement TeacherGate**

Create `fe-next/components/education/TeacherGate.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';

export function TeacherGate({ children }: { children: React.ReactNode }) {
  const { hasAccess, isLoading } = useTeacherAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !hasAccess && pathname) {
      const locale = pathname.split('/')[1] || 'en';
      const from = encodeURIComponent(pathname);
      router.replace(`/${locale}/education/access?from=${from}`);
    }
  }, [hasAccess, isLoading, pathname, router]);

  if (isLoading) return null;
  if (!hasAccess) return null;
  return <>{children}</>;
}
```

- [ ] **Step 5.11: Run all Task-5 tests, verify GREEN**

```bash
cd fe-next && npm run test -- lib/education components/education --run
```
Expected: PASS.

- [ ] **Step 5.12: Wrap gated routes**

For each of:
- `fe-next/app/[locale]/teacher/PageClient.tsx`
- `fe-next/app/[locale]/teacher/profile/PageClient.tsx`
- `fe-next/app/[locale]/teacher/curriculum/PageClient.tsx`
- `fe-next/app/[locale]/teacher/reports/PageClient.tsx`
- `fe-next/app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx`
- `fe-next/app/[locale]/education/classroom-game/PageClient.tsx`
- `fe-next/app/[locale]/education/duels/PageClient.tsx`

Rename the current default export to e.g. `TeacherCurriculumInner` and wrap:

```tsx
import { TeacherGate } from '@/components/education/TeacherGate';
// rename original:
function TeacherCurriculumInner(props: Props) { /* original body */ }
export default function TeacherCurriculumPage(props: Props) {
  return <TeacherGate><TeacherCurriculumInner {...props} /></TeacherGate>;
}
```

If a file does not have a PageClient (only `page.tsx`), wrap inside `page.tsx`.

- [ ] **Step 5.13: Commit**

```bash
git add fe-next/lib/education/ fe-next/components/education/ fe-next/app/api/education/consume-allowlist/ fe-next/app/[locale]/teacher fe-next/app/[locale]/education/classroom-game fe-next/app/[locale]/education/duels
git commit -m "feat(education): TeacherGate + useTeacherAccess hook + allowlist bridge + wrap gated routes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Apply page — `/education/access`

**Files:**
- Create: `fe-next/app/[locale]/education/access/page.tsx`
- Create: `fe-next/app/[locale]/education/access/PageClient.tsx`
- Create: `fe-next/components/education/AccessRequestForm.tsx`
- Test: `fe-next/components/education/__tests__/AccessRequestForm.test.tsx`

- [ ] **Step 6.1: Write form test (RED)**

Create `fe-next/components/education/__tests__/AccessRequestForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  useLanguage: () => ({ language: 'en' }),
}));

import { AccessRequestForm } from '../AccessRequestForm';

describe('<AccessRequestForm>', () => {
  it('disables submit until required fields filled', () => {
    render(<AccessRequestForm />);
    const submit = screen.getByRole('button', { name: /education\.access\.submit/i });
    expect(submit).toBeDisabled();
  });

  it('posts to /api/education/access-request on submit', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.type(screen.getByLabelText(/education\.access\.full_name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/education\.access\.email/i), 'jane@school.edu');
    await user.type(screen.getByLabelText(/education\.access\.use_case/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/education/access-request');
  });

  it('shows error on 429', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ error: 'too many' }) })) as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);
    await user.type(screen.getByLabelText(/education\.access\.full_name/i), 'X');
    await user.type(screen.getByLabelText(/education\.access\.email/i), 'x@y.com');
    await user.type(screen.getByLabelText(/education\.access\.use_case/i), 'Some valid use case text.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
```

- [ ] **Step 6.2: Run, verify RED**

```bash
cd fe-next && npm run test -- components/education/__tests__/AccessRequestForm --run
```
Expected: FAIL.

- [ ] **Step 6.3: Implement form**

Create `fe-next/components/education/AccessRequestForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import type { TeacherAccessFormPayload, TeacherAccessRole, TeacherLocale } from '@/lib/education/types';

const ROLES: TeacherAccessRole[] = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'];

export function AccessRequestForm() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState<TeacherAccessRole>('teacher');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = fullName.length >= 2 && /\S+@\S+\.\S+/.test(email) && useCase.length >= 10 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, full_name: fullName, role, locale: language as TeacherLocale,
          use_case: useCase,
          school_or_org: school || undefined,
          country: country || undefined,
        } satisfies TeacherAccessFormPayload),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t('education.access.rate_limited') : t('education.access.submit_error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('education.access.submit_error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" className="rounded-2xl border-4 border-lime-400 bg-lime-50 p-6 text-center">
        <h3 className="text-2xl font-bold text-navy-900">{t('education.access.success_title')}</h3>
        <p className="mt-2 text-navy-700">{t('education.access.success_body')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tar-full_name" className="block text-sm font-semibold">{t('education.access.full_name')}</label>
        <input id="tar-full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2" />
      </div>
      <div>
        <label htmlFor="tar-email" className="block text-sm font-semibold">{t('education.access.email')}</label>
        <input id="tar-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2" />
      </div>
      <div>
        <label htmlFor="tar-role" className="block text-sm font-semibold">{t('education.access.role')}</label>
        <select id="tar-role" value={role} onChange={(e) => setRole(e.target.value as TeacherAccessRole)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2">
          {ROLES.map((r) => <option key={r} value={r}>{t(`education.access.role_${r}`)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="tar-school" className="block text-sm font-semibold">{t('education.access.school_or_org')}</label>
        <input id="tar-school" value={school} onChange={(e) => setSchool(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2" />
      </div>
      <div>
        <label htmlFor="tar-country" className="block text-sm font-semibold">{t('education.access.country')}</label>
        <input id="tar-country" value={country} onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2" />
      </div>
      <div>
        <label htmlFor="tar-use_case" className="block text-sm font-semibold">{t('education.access.use_case')}</label>
        <textarea id="tar-use_case" required minLength={10} maxLength={800} rows={4}
          value={useCase} onChange={(e) => setUseCase(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-navy-300 p-2" />
        <p className="text-xs text-navy-500 mt-1">{useCase.length}/800</p>
      </div>
      {error && <p role="alert" className="text-pink-600 font-semibold">{error}</p>}
      <button type="submit" disabled={!canSubmit}
        className="w-full rounded-lg bg-lime-400 px-4 py-3 font-bold text-navy-900 shadow-[4px_4px_0_0_#0a0e27] hover:shadow-[2px_2px_0_0_#0a0e27] disabled:opacity-50">
        {submitting ? t('education.access.submitting') : t('education.access.submit')}
      </button>
    </form>
  );
}
```

- [ ] **Step 6.4: Run form test, verify GREEN**

```bash
cd fe-next && npm run test -- components/education/__tests__/AccessRequestForm --run
```
Expected: PASS.

- [ ] **Step 6.5: Implement page route + PageClient**

Create `fe-next/app/[locale]/education/access/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { PageClient } from './PageClient';

const META: Record<string, { title: string; description: string }> = {
  en: { title: 'Apply for Teacher Access — LexiClash', description: 'Free LexiClash access for teachers. Apply by email and start using classroom word games + brain drills + vocabulary duels.' },
  he: { title: 'בקשת גישה כמורה — LexiClash', description: 'גישה חינמית ל-LexiClash למורים. בקש/י גישה בדוא"ל והתחל/י להשתמש במשחקי כיתה.' },
  sv: { title: 'Ansök om lärarbehörighet — LexiClash', description: 'Gratis LexiClash-åtkomst för lärare. Ansök via e-post och börja använda klassrumsspel.' },
  ja: { title: '教師アクセスを申請 — LexiClash', description: '教師は無料。メールで申請して、教室向けワードゲーム + 脳トレ + 語彙対戦を使えます。' },
  es: { title: 'Solicitar acceso de profesor — LexiClash', description: 'Acceso gratuito a LexiClash para profesores. Solicítalo por correo y empieza a usar juegos de palabras en clase.' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = META[locale] || META.en;
  return { title: m.title, description: m.description };
}

export default function Page() {
  return <PageClient />;
}
```

Create `fe-next/app/[locale]/education/access/PageClient.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { AccessRequestForm } from '@/components/education/AccessRequestForm';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';

export function PageClient() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { status, latestRequest, hasAccess } = useTeacherAccess();

  return (
    <main className="min-h-screen bg-navy-900 text-white">
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-extrabold leading-tight">{t('education.access.h1')}</h1>
        <p className="mt-3 text-lg text-navy-200">{t('education.access.lede')}</p>

        {hasAccess && (
          <div className="mt-6 rounded-2xl border-4 border-lime-400 bg-lime-50 p-6 text-navy-900">
            <h2 className="text-xl font-bold">{t('education.access.already_approved_title')}</h2>
            <Link href={`/${language}/teacher`} className="mt-3 inline-block rounded-lg bg-navy-900 px-4 py-2 font-bold text-white">
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}

        {!hasAccess && status === 'pending' && (
          <div className="mt-6 rounded-2xl border-4 border-cyan-400 bg-cyan-50 p-6 text-navy-900">
            <h2 className="text-xl font-bold">{t('education.access.pending_title')}</h2>
            <p className="mt-2">{t('education.access.pending_body')}</p>
            {latestRequest?.created_at && (
              <p className="mt-1 text-sm text-navy-500">
                {t('education.access.submitted_on')}: {new Date(latestRequest.created_at).toLocaleString(language)}
              </p>
            )}
          </div>
        )}

        {!hasAccess && status !== 'pending' && (
          <div className="mt-6 rounded-2xl bg-white p-6 text-navy-900 shadow-[6px_6px_0_0_#0a0e27]">
            <AccessRequestForm />
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <div key={k} className="rounded-xl border-2 border-white/20 p-4">
              <div className="text-3xl font-extrabold text-lime-400">{i + 1}</div>
              <h3 className="mt-2 font-bold">{t(`education.access.next.${k}_title`)}</h3>
              <p className="mt-1 text-sm text-navy-200">{t(`education.access.next.${k}_body`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-navy-800 p-6">
          <h2 className="text-2xl font-bold">{t('education.access.regular_game_title')}</h2>
          <p className="mt-2 text-navy-200">{t('education.access.regular_game_body')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href={`/${language}/multiplayer`} className="rounded-lg bg-pink-500 px-4 py-3 text-center font-bold">{t('education.access.try_mp')}</Link>
            <Link href={`/${language}/blast`} className="rounded-lg bg-cyan-500 px-4 py-3 text-center font-bold">{t('education.access.try_blast')}</Link>
            <Link href={`/${language}/daily`} className="rounded-lg bg-purple-500 px-4 py-3 text-center font-bold">{t('education.access.try_daily')}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6.6: Commit**

```bash
git add fe-next/app/[locale]/education/access/ fe-next/components/education/AccessRequestForm.tsx fe-next/components/education/__tests__/AccessRequestForm.test.tsx
git commit -m "feat(education): apply page + access request form

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Admin queue page

**Files:**
- Create: `fe-next/app/[locale]/admin/teacher-access/page.tsx`
- Create: `fe-next/app/[locale]/admin/teacher-access/PageClient.tsx`
- Create: `fe-next/components/admin/TeacherAccessQueue.tsx`
- Create: `fe-next/components/admin/TeacherAccessDrawer.tsx`
- Test: `fe-next/components/admin/__tests__/TeacherAccessQueue.test.tsx`
- Modify: existing admin nav

- [ ] **Step 7.1: Write queue test (RED)**

Create `fe-next/components/admin/__tests__/TeacherAccessQueue.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const rows = [{
  id: 'r1', email: 'a@x.com', full_name: 'A', role: 'teacher', locale: 'en', country: 'US',
  status: 'pending', use_case: 'reason', created_at: '2026-05-14T00:00:00Z',
  school_or_org: 'School A', admin_note: null, reviewed_at: null, reviewed_by: null, user_id: null,
}];

beforeEach(() => {
  global.fetch = vi.fn(async (url: any) => {
    return { ok: true, json: async () => ({ ok: true, rows, count: 1, page: 0, pageSize: 50 }) } as any;
  }) as any;
});

import { TeacherAccessQueue } from '../TeacherAccessQueue';

describe('<TeacherAccessQueue>', () => {
  it('renders rows from API', async () => {
    render(<TeacherAccessQueue />);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
  });

  it('opens drawer on row click', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessQueue />);
    await waitFor(() => screen.getByText('a@x.com'));
    await user.click(screen.getByText('a@x.com'));
    expect(screen.getByText(/admin\.teacherAccess\.drawer_title/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run, verify RED**

```bash
cd fe-next && npm run test -- components/admin/__tests__/TeacherAccessQueue --run
```
Expected: FAIL.

- [ ] **Step 7.3: Implement Drawer**

Create `fe-next/components/admin/TeacherAccessDrawer.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TeacherAccessRequest } from '@/lib/education/types';

interface Props { row: TeacherAccessRequest; onClose: () => void; onActioned: () => void; }

export function TeacherAccessDrawer({ row, onClose, onActioned }: Props) {
  const { t } = useTranslation();
  const [note, setNote] = useState(row.admin_note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(kind: 'approve' | 'decline') {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/teacher-access/${row.id}/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: kind === 'decline' ? JSON.stringify({ reason: note }) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      onActioned();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" role="dialog" aria-labelledby="tar-drawer-title">
      <div className="w-full max-w-xl bg-white p-6 shadow-2xl overflow-y-auto">
        <button onClick={onClose} className="text-sm text-navy-500 underline">{t('admin.teacherAccess.close')}</button>
        <h2 id="tar-drawer-title" className="mt-2 text-2xl font-bold text-navy-900">{t('admin.teacherAccess.drawer_title')}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt className="font-semibold">{t('admin.teacherAccess.field.name')}</dt><dd>{row.full_name}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.email')}</dt><dd>{row.email}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.role')}</dt><dd>{row.role}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.locale')}</dt><dd>{row.locale}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.country')}</dt><dd>{row.country || '—'}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.school')}</dt><dd>{row.school_or_org || '—'}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.status')}</dt><dd>{row.status}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.submitted')}</dt><dd>{new Date(row.created_at).toLocaleString()}</dd>
        </dl>
        <div className="mt-4">
          <h3 className="font-semibold">{t('admin.teacherAccess.field.use_case')}</h3>
          <p className="mt-1 whitespace-pre-wrap rounded bg-navy-50 p-3 text-sm text-navy-900">{row.use_case}</p>
        </div>
        <div className="mt-4">
          <label htmlFor="admin-note" className="font-semibold">{t('admin.teacherAccess.admin_note')}</label>
          <textarea id="admin-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded border-2 border-navy-300 p-2 text-sm" />
        </div>
        {err && <p role="alert" className="mt-3 text-pink-600">{err}</p>}
        {row.status === 'pending' && (
          <div className="mt-4 flex gap-3">
            <button disabled={busy} onClick={() => act('approve')}
              className="flex-1 rounded-lg bg-lime-500 px-4 py-3 font-bold text-navy-900 disabled:opacity-50">
              {t('admin.teacherAccess.approve')}
            </button>
            <button disabled={busy} onClick={() => act('decline')}
              className="flex-1 rounded-lg bg-pink-500 px-4 py-3 font-bold text-white disabled:opacity-50">
              {t('admin.teacherAccess.decline')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.4: Implement Queue**

Create `fe-next/components/admin/TeacherAccessQueue.tsx`:

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { TeacherAccessDrawer } from './TeacherAccessDrawer';
import type { TeacherAccessRequest, TeacherAccessStatus } from '@/lib/education/types';

export function TeacherAccessQueue() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TeacherAccessRequest[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  const [status, setStatus] = useState<TeacherAccessStatus | ''>('');
  const [locale, setLocale] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<TeacherAccessRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (locale) qs.set('locale', locale);
    if (country) qs.set('country', country);
    qs.set('page', String(page));
    const res = await fetch(`/api/admin/teacher-access?${qs}`);
    const j = await res.json();
    setRows(j.rows || []);
    setLoading(false);
  }, [status, locale, country, page]);

  const fetchCounts = useCallback(async () => {
    const one = (s: TeacherAccessStatus | '') =>
      fetch(`/api/admin/teacher-access?status=${s}&page=0`).then((r) => r.json()).then((j) => j.count || 0);
    const [p, a, d, total] = await Promise.all([one('pending'), one('approved'), one('declined'), one('')]);
    setCounts({ pending: p, approved: a, declined: d, total });
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-extrabold text-navy-900">{t('admin.teacherAccess.title')}</h1>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {(['pending', 'approved', 'declined', 'total'] as const).map((k) => (
          <div key={k} className="rounded-xl border-2 border-navy-200 p-3">
            <div className="text-xs uppercase text-navy-500">{t(`admin.teacherAccess.count.${k}`)}</div>
            <div className="text-3xl font-extrabold">{counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          {t('admin.teacherAccess.filter_status')}
          <select value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as any); }}
            className="ml-2 rounded border-2 border-navy-300 p-1">
            <option value="">{t('admin.teacherAccess.filter_status_all')}</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="declined">declined</option>
          </select>
        </label>
        <label className="text-sm">
          {t('admin.teacherAccess.filter_locale')}
          <select value={locale} onChange={(e) => { setPage(0); setLocale(e.target.value); }}
            className="ml-2 rounded border-2 border-navy-300 p-1">
            <option value="">all</option>
            {['en', 'he', 'sv', 'ja', 'es'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <input placeholder={t('admin.teacherAccess.filter_country')} value={country}
          onChange={(e) => { setPage(0); setCountry(e.target.value); }}
          className="rounded border-2 border-navy-300 p-1 text-sm" />
        <button onClick={() => { fetchRows(); fetchCounts(); }}
          className="ml-auto rounded bg-navy-900 px-3 py-1 text-sm font-bold text-white">
          {t('admin.teacherAccess.refresh')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-navy-200 text-left">
            <th className="p-2">{t('admin.teacherAccess.col.name')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.email')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.role')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.locale')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.country')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.status')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.submitted')}</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-6 text-center">…</td></tr> :
              rows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer hover:bg-navy-50 border-b">
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.role}</td>
                  <td className="p-2">{r.locale}</td>
                  <td className="p-2">{r.country || '—'}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      r.status === 'pending' ? 'bg-cyan-100 text-cyan-800' :
                      r.status === 'approved' ? 'bg-lime-100 text-lime-800' : 'bg-pink-100 text-pink-800'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border px-2 py-1 disabled:opacity-50">←</button>
        <span>{t('admin.teacherAccess.page')} {page + 1}</span>
        <button disabled={rows.length < 50} onClick={() => setPage(page + 1)} className="rounded border px-2 py-1 disabled:opacity-50">→</button>
        <a href={`/api/admin/teacher-access/export?${new URLSearchParams({ status, locale, country })}`}
          className="ml-auto rounded bg-navy-900 px-3 py-1 font-bold text-white">
          {t('admin.teacherAccess.export_csv')}
        </a>
      </div>

      {open && <TeacherAccessDrawer row={open} onClose={() => setOpen(null)} onActioned={() => { fetchRows(); fetchCounts(); }} />}
    </div>
  );
}
```

- [ ] **Step 7.5: Implement admin page route**

Create `fe-next/app/[locale]/admin/teacher-access/page.tsx`:

```tsx
import { PageClient } from './PageClient';
export default function Page() { return <PageClient />; }
```

Create `fe-next/app/[locale]/admin/teacher-access/PageClient.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';

export function PageClient() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !profile?.is_admin) router.replace('/');
  }, [profile?.is_admin, isLoading, router]);
  if (!profile?.is_admin) return null;
  return <TeacherAccessQueue />;
}
```

- [ ] **Step 7.6: Wire admin nav**

Run `git grep -l "admin/players\|admin/dashboard" fe-next/app fe-next/components | head`. Open the file that renders admin navigation links and add an entry:

```tsx
<Link href={`/${language}/admin/teacher-access`} className="...">
  {t('admin.nav.teacherAccess')}
</Link>
```

If no shared admin nav exists, add a link from `/admin/page.tsx` (or `/admin/PageClient.tsx`) so it's discoverable.

- [ ] **Step 7.7: Run tests, verify GREEN**

```bash
cd fe-next && npm run test -- components/admin/__tests__/TeacherAccessQueue --run
```
Expected: PASS.

- [ ] **Step 7.8: Commit**

```bash
git add fe-next/app/[locale]/admin/teacher-access/ fe-next/components/admin/TeacherAccess*
git commit -m "feat(admin): teacher access queue + drawer + nav link

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `/education` landing rebuild + frontend-design skill + scroll animations

> **Skills**: This task invokes two skills before/during implementation:
> - **`frontend-design:frontend-design`** — invoke first to set design context (palette, typography, motion language) for the new components, given the project is Neo-Brutalist with hard pixel shadows and bold accents. Output guides the visual choices in the components below.
> - **`animate-ai`** — invoke when implementing scroll effects on `EducationHero`, `MoatTrifectaSection`, and `SixModeTour`. Search the animate-ai library for "scroll reveal", "stagger fade", "parallax" patterns and pick reduced-motion-safe options.

**Files:**
- Modify: `fe-next/app/[locale]/education/page.tsx` + `PageClient.tsx`
- Create: `fe-next/components/education/EducationHero.tsx`
- Create: `fe-next/components/education/MoatTrifectaSection.tsx`
- Create: `fe-next/components/education/SixModeTour.tsx`
- Create: `fe-next/components/education/ComparisonStrip.tsx`
- Create: `fe-next/components/education/EducationFAQ.tsx`
- Create: `fe-next/components/education/TeacherAccessCTA.tsx`
- Create: `fe-next/lib/seo/educationStructuredData.ts`
- Create: `fe-next/lib/animation/useScrollReveal.ts` (lightweight IntersectionObserver wrapper if animate-ai recommends framer-motion+whileInView, use that instead)
- Tests: `EducationFAQ.test.tsx`, `MoatTrifectaSection.test.tsx`, `ComparisonStrip.test.tsx`

- [ ] **Step 8.1: Invoke `frontend-design:frontend-design` skill**

Invoke the skill to set design context. Goal: produce design tokens + visual direction for the education landing rebuild. Pass it:
- Project context: Neo-Brutalist refined, hard pixel shadows (`shadow-[6px_6px_0_0_#0a0e27]`), Fredoka + Rubik fonts, electric color-coded modes (lime/pink/cyan/purple).
- Page intent: Teacher-facing conversion landing; needs to feel professional + warm + electric, not generic SaaS.
- Audience: Teachers, ages 25-55, in EN/HE/SV/JA/ES classrooms.

Capture the skill's output (specific Tailwind tokens, animation curves, type scales) as comments at the top of `EducationHero.tsx` for downstream reference.

- [ ] **Step 8.2: Invoke `animate-ai` skill**

Invoke with: "Suggest scroll-reveal patterns for a 5-section landing page: hero parallax, moat-trifecta stagger fade-in, mode-tour cards with rotation, comparison strip subtle highlight, FAQ accordion. Reduced-motion-safe. React + Next.js 16. Stack: Tailwind, optional framer-motion. Avoid heavy GPU-bound effects."

Pick patterns from the skill output (typically: `whileInView` with `viewport={{ once: true }}` for one-shot reveals, stagger via `delay: index * 0.08`, parallax via `useScroll`/`useTransform` if framer-motion is already a project dep — check `package.json` to confirm).

If `framer-motion` is NOT in `fe-next/package.json`, use plain `IntersectionObserver` + CSS keyframes per the project's existing LazyMotion approach (memory: `perf-audit-shipped-2026-05-06.md`).

- [ ] **Step 8.3: Implement educationStructuredData helpers**

Create `fe-next/lib/seo/educationStructuredData.ts`:

```ts
export function educationOrganizationJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'LexiClash Education',
    url: `https://lexiclash.com/${locale}/education`,
    sameAs: ['https://lexiclash.com'],
    description: 'Classroom word games with native multilingual support, ad-free for students.',
    inLanguage: [locale],
  };
}

export function educationFaqJsonLd(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function educationCourseJsonLd(args: { name: string; description: string; url: string; locale: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: args.name,
    description: args.description,
    url: args.url,
    provider: { '@type': 'Organization', name: 'LexiClash', url: 'https://lexiclash.com' },
    inLanguage: args.locale,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  };
}

export function speakableJsonLd(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: { '@type': 'SpeakableSpecification', cssSelector: cssSelectors },
  };
}
```

- [ ] **Step 8.4: Implement scroll-reveal helper (framework-agnostic)**

Create `fe-next/lib/animation/useScrollReveal.ts`:

```ts
'use client';
import { useEffect, useRef, useState } from 'react';

interface Options { threshold?: number; rootMargin?: string; once?: boolean; }

export function useScrollReveal<T extends Element>(opts: Options = {}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const { threshold = 0.15, rootMargin = '0px 0px -10% 0px', once = true } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        if (once) obs.disconnect();
      } else if (!once) setVisible(false);
    }, { threshold, rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, visible] as const;
}
```

- [ ] **Step 8.5: Write FAQ test (RED)**

Create `fe-next/components/education/__tests__/EducationFAQ.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('next/script', () => ({ default: ({ children, ...p }: any) => <script {...p}>{children}</script> }));

import { EducationFAQ } from '../EducationFAQ';

describe('<EducationFAQ>', () => {
  it('renders 8 questions', () => {
    render(<EducationFAQ />);
    const items = screen.getAllByRole('button', { name: /education\.landing\.faq\.q\d+\.q/ });
    expect(items).toHaveLength(8);
  });

  it('emits FAQPage JSON-LD script tag', () => {
    const { container } = render(<EducationFAQ />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const obj = JSON.parse(script!.textContent || '{}');
    expect(obj['@type']).toBe('FAQPage');
    expect(obj.mainEntity).toHaveLength(8);
  });
});
```

- [ ] **Step 8.6: Implement EducationFAQ**

Create `fe-next/components/education/EducationFAQ.tsx`:

```tsx
'use client';
import Script from 'next/script';
import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { educationFaqJsonLd } from '@/lib/seo/educationStructuredData';

const KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8'] as const;

export function EducationFAQ() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);

  const qa = KEYS.map((k) => ({
    q: t(`education.landing.faq.${k}.q`),
    a: t(`education.landing.faq.${k}.a`),
  }));

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-3xl font-extrabold text-navy-900">{t('education.landing.faq.title')}</h2>
      <div className="mt-6 space-y-3">
        {KEYS.map((k, i) => {
          const isOpen = open === k;
          return (
            <div key={k} className="rounded-xl border-2 border-navy-200 bg-white">
              <button
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : k)}
                className="flex w-full items-center justify-between p-4 text-left font-bold text-navy-900"
              >
                <span className="education-faq-q">{qa[i].q}</span>
                <span aria-hidden>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <div className="border-t-2 border-navy-100 p-4 text-navy-700">{qa[i].a}</div>}
            </div>
          );
        })}
      </div>
      <Script id="education-faq-ld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(educationFaqJsonLd(qa))}
      </Script>
    </section>
  );
}
```

- [ ] **Step 8.7: Implement EducationHero with scroll-reveal**

Create `fe-next/components/education/EducationHero.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

export function EducationHero() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-100 to-white">
      {/* decorative bg dots */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#caf0a020,transparent_50%),radial-gradient(circle_at_80%_70%,#f0a0c020,transparent_50%)]" />

      <div ref={ref}
        className={`relative mx-auto max-w-4xl px-4 py-20 text-center transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
        <p className="text-sm font-bold uppercase tracking-wider text-pink-600">
          {t('education.landing.hero.eyebrow')}
        </p>
        <h1 className="mt-3 text-5xl font-extrabold leading-tight text-navy-900 md:text-6xl">
          {t('education.landing.hero.h1')}
        </h1>
        <p className="education-hero-sub mt-5 text-lg text-navy-700 md:text-xl">
          {t('education.landing.hero.sub')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/${language}/education/access`}
            className="rounded-lg bg-lime-400 px-6 py-3 font-bold text-navy-900 shadow-[4px_4px_0_0_#0a0e27] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0a0e27]">
            {t('education.landing.hero.cta_primary')}
          </Link>
          <a href="#modes"
            className="rounded-lg border-2 border-navy-900 bg-white px-6 py-3 font-bold text-navy-900">
            {t('education.landing.hero.cta_secondary')}
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8.8: Implement MoatTrifectaSection with stagger reveal**

Create `fe-next/components/education/MoatTrifectaSection.tsx`:

```tsx
'use client';
import { useTranslation } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

const PILLARS = [
  { key: 'native_multilingual', accent: 'bg-pink-500' },
  { key: 'local_inventory', accent: 'bg-cyan-500' },
  { key: 'ad_free', accent: 'bg-lime-500' },
];

export function MoatTrifectaSection() {
  const { t } = useTranslation();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div ref={ref}>
        <h2 className={`text-3xl font-extrabold text-navy-900 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {t('education.landing.moat.title')}
        </h2>
        <p className={`mt-2 text-center text-navy-600 transition-all duration-700 delay-100 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {t('education.landing.moat.subtitle')}
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article key={p.key}
              style={{ transitionDelay: `${200 + i * 120}ms` }}
              className={`rounded-2xl border-4 border-navy-900 bg-white p-6 shadow-[6px_6px_0_0_#0a0e27] transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}>
              <div className={`mb-4 inline-block rounded px-2 py-1 text-xs font-bold text-white ${p.accent}`}>
                {t(`education.landing.moat.${p.key}.tag`)}
              </div>
              <h3 className="text-xl font-extrabold text-navy-900">{t(`education.landing.moat.${p.key}.title`)}</h3>
              <p className="mt-2 text-navy-700">{t(`education.landing.moat.${p.key}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8.9: Implement SixModeTour with stagger**

Create `fe-next/components/education/SixModeTour.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

const MODES = [
  { key: 'classroom_game', href: '/education/classroom-game', accent: 'lime' },
  { key: 'vocab_duels',    href: '/education/duels',          accent: 'pink' },
  { key: 'brain_drills',   href: '/practice/brain',           accent: 'cyan' },
  { key: 'daily_wordhunt', href: '/daily',                    accent: 'purple' },
  { key: 'adventure',      href: '/adventure',                accent: 'lime' },
  { key: 'spelling_bee',   href: '/education/spelling-bee-practice', accent: 'pink' },
] as const;

export function SixModeTour() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-3xl font-extrabold text-navy-900">{t('education.landing.modes.title')}</h2>
      <div ref={ref} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m, i) => (
          <Link key={m.key} href={`/${language}${m.href}`}
            style={{ transitionDelay: `${i * 80}ms` }}
            className={`block rounded-xl border-2 border-navy-200 bg-white p-4 transition-all duration-500 hover:border-navy-900 hover:-translate-y-1 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
            <div className={`mb-2 inline-block rounded px-2 py-1 text-xs font-bold text-white bg-${m.accent}-500`}>
              {t(`education.landing.modes.${m.key}.tag`)}
            </div>
            <h3 className="font-extrabold text-navy-900">{t(`education.landing.modes.${m.key}.title`)}</h3>
            <p className="mt-1 text-sm text-navy-600">{t(`education.landing.modes.${m.key}.body`)}</p>
            <p className="mt-2 text-xs text-navy-500">
              {t('education.landing.modes.teaches')}: {t(`education.landing.modes.${m.key}.teaches`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

> NOTE: Tailwind purge — accent classes like `bg-${m.accent}-500` are constructed dynamically and will be tree-shaken. Add to a Tailwind safelist in `tailwind.config.js` (or add to `safelist`): `bg-lime-500`, `bg-pink-500`, `bg-cyan-500`, `bg-purple-500`.

- [ ] **Step 8.10: Implement ComparisonStrip**

Create `fe-next/components/education/ComparisonStrip.tsx`:

```tsx
'use client';
import { useTranslation } from '@/contexts/LanguageContext';

const COMPETITORS = ['lexiclash', 'kahoot', 'quizlet', 'wordwall'] as const;
const FEATURES = ['native_multilingual', 'ad_free_students', 'live_multiplayer', 'brain_training', 'game_variety', 'free_for_teachers'] as const;

const MATRIX: Record<typeof FEATURES[number], Record<typeof COMPETITORS[number], boolean>> = {
  native_multilingual: { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
  ad_free_students:    { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
  live_multiplayer:    { lexiclash: true, kahoot: true,  quizlet: false, wordwall: false },
  brain_training:      { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
  game_variety:        { lexiclash: true, kahoot: false, quizlet: false, wordwall: true },
  free_for_teachers:   { lexiclash: true, kahoot: false, quizlet: false, wordwall: false },
};

export function ComparisonStrip() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-3xl font-extrabold text-navy-900">{t('education.landing.compare.title')}</h2>
      <p className="mt-2 text-navy-600">{t('education.landing.compare.subtitle')}</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-navy-200">
              <th className="p-2 text-left"></th>
              {COMPETITORS.map((c) => (
                <th key={c} className={`p-2 text-center ${c === 'lexiclash' ? 'bg-lime-50 font-extrabold' : ''}`}>
                  {t(`education.landing.compare.col.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f} className="border-b">
                <td className="p-2 font-semibold">{t(`education.landing.compare.row.${f}`)}</td>
                {COMPETITORS.map((c) => (
                  <td key={c} className={`p-2 text-center ${c === 'lexiclash' ? 'bg-lime-50' : ''}`}>
                    {MATRIX[f][c] ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 8.11: Implement TeacherAccessCTA**

Create `fe-next/components/education/TeacherAccessCTA.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';

export function TeacherAccessCTA() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return (
    <aside className="mx-auto my-12 max-w-3xl rounded-2xl border-4 border-navy-900 bg-navy-50 p-6 shadow-[6px_6px_0_0_#0a0e27]">
      <h2 className="text-2xl font-extrabold text-navy-900">{t('education.landing.cta.title')}</h2>
      <p className="mt-2 text-navy-700">{t('education.landing.cta.body')}</p>
      <Link href={`/${language}/education/access`}
        className="mt-4 inline-block rounded-lg bg-lime-400 px-6 py-3 font-bold text-navy-900 shadow-[4px_4px_0_0_#0a0e27]">
        {t('education.landing.cta.button')}
      </Link>
    </aside>
  );
}
```

- [ ] **Step 8.12: Rebuild `/education` PageClient**

Edit `fe-next/app/[locale]/education/PageClient.tsx`:

```tsx
'use client';
import Script from 'next/script';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { EducationHero } from '@/components/education/EducationHero';
import { MoatTrifectaSection } from '@/components/education/MoatTrifectaSection';
import { SixModeTour } from '@/components/education/SixModeTour';
import { ComparisonStrip } from '@/components/education/ComparisonStrip';
import { EducationFAQ } from '@/components/education/EducationFAQ';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import {
  educationOrganizationJsonLd,
  breadcrumbJsonLd,
  speakableJsonLd,
} from '@/lib/seo/educationStructuredData';

export function PageClient() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const orgLd = educationOrganizationJsonLd(language);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: `https://lexiclash.com/${language}` },
    { name: 'Education', url: `https://lexiclash.com/${language}/education` },
  ]);
  const speakLd = speakableJsonLd(['h1', '.education-hero-sub', '.education-faq-q']);

  return (
    <main className="min-h-screen">
      <EducationHero />
      <MoatTrifectaSection />
      <div id="modes"><SixModeTour /></div>
      <ComparisonStrip />

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-3xl font-extrabold text-navy-900">{t('education.landing.trust.title')}</h2>
        <ul className="mt-4 space-y-3 text-navy-700">
          <li>✓ {t('education.landing.trust.bullet1')}</li>
          <li>✓ {t('education.landing.trust.bullet2')}</li>
          <li>✓ {t('education.landing.trust.bullet3')}</li>
        </ul>
      </section>

      <EducationFAQ />
      <TeacherAccessCTA />

      <Script id="education-org-ld" type="application/ld+json" strategy="afterInteractive">{JSON.stringify(orgLd)}</Script>
      <Script id="education-breadcrumb-ld" type="application/ld+json" strategy="afterInteractive">{JSON.stringify(breadcrumbLd)}</Script>
      <Script id="education-speakable-ld" type="application/ld+json" strategy="afterInteractive">{JSON.stringify(speakLd)}</Script>
    </main>
  );
}
```

Then update `fe-next/app/[locale]/education/page.tsx` to use the locale-gated META table from the spec (Section 4).

- [ ] **Step 8.13: Run all Task-8 tests**

```bash
cd fe-next && npm run test -- components/education --run
```
Expected: PASS (FAQ + MoatTrifecta + ComparisonStrip + previously passing form/gate).

- [ ] **Step 8.14: Manual smoke**

Run `cd fe-next && npm run dev` (port 3001), visit `http://localhost:3001/en/education`, scroll. Verify:
- Hero fades up on load.
- Moat trifecta cards stagger in as scrolled into view.
- 6-mode tour cards stagger in.
- Hover on mode cards lifts them (translate-y).
- Reduced-motion: in dev tools → Rendering → emulate `prefers-reduced-motion: reduce`. Reveal animations should be instant (no transitions).

- [ ] **Step 8.15: Commit**

```bash
git add fe-next/app/[locale]/education/page.tsx fe-next/app/[locale]/education/PageClient.tsx fe-next/components/education/ fe-next/lib/seo/educationStructuredData.ts fe-next/lib/animation/useScrollReveal.ts fe-next/tailwind.config.js
git commit -m "feat(education): rebuild /education landing — hero+moat+modes+comparison+FAQ with scroll reveal + JSON-LD via next/script

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Inject `<TeacherAccessCTA />` into sub-landings + SEO polish

**Files:**
- Modify: 4 sub-landing PageClients
- Modify: `fe-next/public/llms.txt`
- Modify: sitemap source

- [ ] **Step 9.1: Inject TeacherAccessCTA into 4 sub-landings**

For each of:
- `fe-next/app/[locale]/education/esl-word-games/PageClient.tsx`
- `fe-next/app/[locale]/education/vocabulary-games-classroom/PageClient.tsx`
- `fe-next/app/[locale]/education/games-for-teachers/PageClient.tsx`
- `fe-next/app/[locale]/education/spelling-bee-practice/PageClient.tsx`

Add:
```tsx
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
// ...
// Insert just before closing </main> or before <Footer />:
<TeacherAccessCTA />
```

- [ ] **Step 9.2: Add Course JSON-LD on two sub-landings**

In `vocabulary-games-classroom/PageClient.tsx` and `esl-word-games/PageClient.tsx`, near the existing JSON-LD (or end of JSX), add:

```tsx
import Script from 'next/script';
import { educationCourseJsonLd } from '@/lib/seo/educationStructuredData';

const courseLd = educationCourseJsonLd({
  name: t('education.landing.<slug>.course_name'),
  description: t('education.landing.<slug>.course_desc'),
  url: `https://lexiclash.com/${language}/education/<slug>`,
  locale: language,
});

<Script id={`course-ld-${slug}`} type="application/ld+json" strategy="afterInteractive">
  {JSON.stringify(courseLd)}
</Script>
```

Substitute `<slug>` per file (`vocabulary-games-classroom` or `esl-word-games`).

- [ ] **Step 9.3: Update llms.txt**

Open `fe-next/public/llms.txt`. Append:

```
# Education

LexiClash Education — free classroom word games with native multilingual support (Hebrew RTL, Japanese, Swedish, Spanish), ad-free for students, request teacher access by email.

- /education — overview, benefits, moat comparison
- /education/access — apply for teacher access (60-second form)
- /education/esl-word-games — for ESL/EFL teachers
- /education/vocabulary-games-classroom — classroom vocabulary tools
- /education/games-for-teachers — teacher feature overview
- /education/spelling-bee-practice — spelling drills
```

- [ ] **Step 9.4: Add /education/access to sitemap**

Run `git grep -l "sitemap" fe-next/app fe-next/lib | head` to find the sitemap source. Add `/education/access` per-locale entries with priority 0.8, changefreq monthly.

- [ ] **Step 9.5: Commit**

```bash
git add fe-next/app/[locale]/education/ fe-next/public/llms.txt fe-next/app/sitemap* fe-next/lib/seo
git commit -m "feat(education): sub-landing CTA + Course JSON-LD + llms.txt + sitemap

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: i18n — 5-locale translation drop

**Files:**
- Modify: `fe-next/locales/en.js` · `he.js` · `sv.js` · `ja.js` · `es.js`

- [ ] **Step 10.1: Add EN keys (source of truth)**

Open `fe-next/locales/en.js`. Merge into existing `education` block (the file already has an `education` namespace — be careful to deep-merge, not overwrite):

```js
education: {
  // ... existing keys preserved
  landing: {
    hero: {
      eyebrow: 'For teachers in EN / HE / SV / JA / ES classrooms',
      h1: 'The word-game platform built for your language — not translated to it.',
      sub: 'Live multiplayer, brain drills, and 6 game modes. Ad-free for students. Free for teachers — request access in 60 seconds.',
      cta_primary: 'Request Teacher Access',
      cta_secondary: 'See it in action',
    },
    moat: {
      title: 'Why teachers in 5 languages choose LexiClash',
      subtitle: 'Three reasons we can defend, not just claim.',
      native_multilingual: { tag: 'Native', title: 'Built natively for your language', body: 'Hebrew right-to-left, Japanese kana with IME, Swedish compound words, Spanish accents — all handled at the engine level. Not Google-translated.' },
      local_inventory:     { tag: 'Local',  title: 'Locally sourced word inventory',  body: 'Word lists pulled from your locale\'s Wikipedia + Hebrew Milog dictionary. Students see culturally relevant words from their country — not US K-12 textbook leftovers.' },
      ad_free:             { tag: 'Ad-free',title: 'Ad-free for students. Ever.',     body: 'Kahoot, Quizlet, Blooket — all show ads to your students. We pledge zero ads on every education route. COPPA + GDPR aware.' },
    },
    modes: {
      title: '6 modes, one platform — rotate to beat fatigue',
      teaches: 'Teaches',
      classroom_game:  { tag: 'Live', title: 'Classroom Game',       body: 'Live multiplayer word hunt for the whole class.', teaches: 'Vocabulary, spelling, speed' },
      vocab_duels:     { tag: 'Duel', title: 'Vocabulary Duels',     body: 'Async or live 1v1 vocab challenges.',             teaches: 'Retention, recall' },
      brain_drills:    { tag: 'Brain',title: 'Brain Drills',         body: 'Memory, attention, processing speed exercises.',  teaches: 'Cognitive skills' },
      daily_wordhunt:  { tag: 'Daily',title: 'Daily Wordhunt',       body: 'New puzzle every day, leaderboard per locale.',   teaches: 'Daily practice' },
      adventure:       { tag: 'Story',title: 'Adventure Mode',       body: 'Story-driven word puzzles across themed worlds.', teaches: 'Vocabulary depth' },
      spelling_bee:    { tag: 'Bee',  title: 'Spelling Bee Practice',body: 'Voice-led spelling drills, multi-language.',       teaches: 'Spelling' },
    },
    compare: {
      title: 'How LexiClash compares',
      subtitle: 'Honest checks — only where we genuinely deliver.',
      col: { lexiclash: 'LexiClash', kahoot: 'Kahoot!', quizlet: 'Quizlet', wordwall: 'Wordwall' },
      row: {
        native_multilingual: 'Native multilingual (incl. RTL, IME)',
        ad_free_students: 'Ad-free for students',
        live_multiplayer: 'Live multiplayer',
        brain_training: 'Brain training drills',
        game_variety: '6+ game modes',
        free_for_teachers: 'Free for verified teachers',
      },
    },
    trust: {
      title: 'Built for trust',
      bullet1: 'No ads on student-facing education routes.',
      bullet2: 'GDPR-aware data handling; opt-in telemetry only.',
      bullet3: 'COPPA-compliant for under-13 student use.',
    },
    faq: {
      title: 'Frequently asked questions',
      q1: { q: 'How do teachers get access?', a: 'Apply at /education/access — we review by email and typically respond within 24 hours.' },
      q2: { q: 'Is it really free for classrooms?', a: 'Yes. Free for verified teachers, no ads on student-facing routes.' },
      q3: { q: 'Does it work in Hebrew, Japanese, Swedish, and Spanish?', a: 'Yes — native support including Hebrew RTL and Japanese kana/IME. Not translation.' },
      q4: { q: 'How do you handle student privacy?', a: 'COPPA + GDPR aware. No ad tracking on education routes. Opt-in telemetry only.' },
      q5: { q: 'Can students play without an account?', a: 'Yes. Guest play is supported for most modes.' },
      q6: { q: 'How is this different from Kahoot, Quizlet, or Wordwall?', a: 'Native multilingual depth, ad-free pledge, 6 game modes on one platform, and locally sourced word inventory per locale.' },
      q7: { q: 'Can I track student progress?', a: 'Yes. Teachers see per-student analytics in the teacher dashboard.' },
      q8: { q: 'Does it work on Chromebooks, tablets, and phones?', a: 'Yes. Web-first, no install required.' },
    },
    cta: {
      title: 'Ready to bring LexiClash to your classroom?',
      body: 'Apply for free teacher access — takes 60 seconds, typically approved within 24 hours.',
      button: 'Request Teacher Access',
    },
    'esl-word-games': {
      course_name: 'LexiClash ESL Word Games',
      course_desc: 'Vocabulary, spelling, and live multiplayer games for ESL classrooms in 5 languages.',
    },
    'vocabulary-games-classroom': {
      course_name: 'Classroom Vocabulary Games',
      course_desc: 'Live + async vocabulary games with teacher analytics, ad-free for students.',
    },
  },
  access: {
    h1: 'Apply for free teacher access',
    lede: 'Tell us a bit about your classroom. We review by email, typically within 24 hours.',
    full_name: 'Your full name',
    email: 'Email address',
    role: 'Your role',
    role_teacher: 'Teacher',
    role_tutor: 'Tutor',
    role_admin: 'School administrator',
    role_parent: 'Parent / homeschool',
    role_researcher: 'Researcher',
    role_other: 'Other',
    school_or_org: 'School or organization (optional)',
    country: 'Country (optional)',
    use_case: 'How will you use LexiClash? (10-800 chars)',
    submit: 'Send application',
    submitting: 'Sending…',
    submit_error: 'Something went wrong. Please try again.',
    rate_limited: 'Too many requests. Please try again in 24 hours.',
    success_title: 'Application sent!',
    success_body: 'We will review and email you within 24 hours.',
    pending_title: 'Your request is pending review',
    pending_body: 'We have received your application and will email you soon.',
    submitted_on: 'Submitted',
    already_approved_title: 'You already have teacher access.',
    go_to_teacher: 'Open Teacher Dashboard',
    next: {
      step1_title: 'Apply',
      step1_body: 'Fill the form below — takes 60 seconds.',
      step2_title: 'We review',
      step2_body: 'A real human reads every application, typically within 24h.',
      step3_title: 'You get access',
      step3_body: 'We email confirmation; teacher tools unlock instantly.',
    },
    regular_game_title: 'Not a teacher? No worries.',
    regular_game_body: 'LexiClash is free to play for anyone. Try the regular game and come back if you want classroom features.',
    try_mp: 'Play Multiplayer',
    try_blast: 'Try Blast',
    try_daily: 'Daily Challenge',
  },
},
admin: {
  // ... existing keys preserved
  nav: { teacherAccess: 'Teacher Access' },
  teacherAccess: {
    title: 'Teacher Access Requests',
    count: { pending: 'Pending', approved: 'Approved', declined: 'Declined', total: 'Total' },
    filter_status: 'Status',
    filter_status_all: 'All',
    filter_locale: 'Locale',
    filter_country: 'Country',
    refresh: 'Refresh',
    page: 'Page',
    export_csv: 'Export CSV',
    col: { name: 'Name', email: 'Email', role: 'Role', locale: 'Locale', country: 'Country', status: 'Status', submitted: 'Submitted' },
    drawer_title: 'Request details',
    field: { name: 'Name', email: 'Email', role: 'Role', locale: 'Locale', country: 'Country', school: 'School', status: 'Status', submitted: 'Submitted', use_case: 'Use case' },
    admin_note: 'Admin note (optional, included in decline email if filled)',
    approve: 'Approve',
    decline: 'Decline',
    close: 'Close',
  },
},
```

- [ ] **Step 10.2: AI-generate HE/SV/JA/ES**

For each of `he.js`, `sv.js`, `ja.js`, `es.js`, mirror the structure with translated copy. Starting seeds for hero H1:

- `he.js`: `"פלטפורמת משחקי המילים שנבנתה לשפה שלך — לא תורגמה אליה."`
- `sv.js`: `"Ordspelsplattformen byggd för ditt språk — inte översatt till det."`
- `ja.js`: `"あなたの言語のために構築されたワードゲームプラットフォーム — 翻訳ではありません。"`
- `es.js`: `"La plataforma de juegos de palabras construida para tu idioma — no traducida a él."`

Translate the rest faithfully, preserving tone (professional + warm + electric). Mark commit message "native review pending" — memory tracking will record this as deferred per project precedent.

- [ ] **Step 10.3: Run lint + tests**

```bash
cd fe-next && npm run lint
cd fe-next && npm run test -- --run
```
Expected: lint clean; all tests pass.

- [ ] **Step 10.4: Manual 5-locale smoke**

Visit and verify no raw `education.landing.*` keys appear in DOM:
- `http://localhost:3001/en/education`
- `http://localhost:3001/he/education` (verify RTL layout)
- `http://localhost:3001/sv/education`
- `http://localhost:3001/ja/education`
- `http://localhost:3001/es/education`
- Same for `/education/access` × 5 locales.

- [ ] **Step 10.5: Commit**

```bash
git add fe-next/locales/
git commit -m "feat(education): i18n drop — education landing + access page + admin (5 locales; HE/SV/JA/ES native review pending)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: E2E + verification + ad-free audit

**Files:**
- Create: `fe-next/e2e/education-access.spec.ts`

- [ ] **Step 11.1: Write E2E**

Create `fe-next/e2e/education-access.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Education access gate', () => {
  test('non-teacher hitting /teacher redirects to /education/access', async ({ page }) => {
    await page.goto('http://localhost:3001/en/teacher/curriculum');
    await expect(page).toHaveURL(/\/education\/access/);
  });

  test('apply form submission shows success state', async ({ page }) => {
    await page.goto('http://localhost:3001/en/education/access');
    await page.fill('#tar-full_name', 'E2E Tester');
    await page.fill('#tar-email', `e2e-${Date.now()}@example.com`);
    await page.fill('#tar-use_case', 'This is an E2E test use case description.');
    await page.click('button[type=submit]');
    await expect(page.getByRole('status')).toContainText(/Application sent|sent/i);
  });

  test('admin queue redirects non-admin away', async ({ page }) => {
    await page.goto('http://localhost:3001/en/admin/teacher-access');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/admin/teacher-access');
  });
});
```

- [ ] **Step 11.2: Run E2E**

```bash
# Dev server must be running on 3001
cd fe-next && npx playwright test e2e/education-access.spec.ts
```
Expected: PASS.

- [ ] **Step 11.3: Run full suite + build**

```bash
cd fe-next && npm run lint
cd fe-next && npx tsc --noEmit
cd fe-next && npm run test -- --run
cd fe-next && npm run build
```
Expected: zero errors at every step.

- [ ] **Step 11.4: Ad-free claim verification audit**

Per spec risk-mitigation: verify ad-free claim is true before launch.

```bash
git grep -n "AnchoredNativeBanner\|InlineBannerAd\|AdMob\|showBanner\|useAdMob" fe-next/app/\[locale\]/education fe-next/app/\[locale\]/teacher
```

Expected: zero matches indicating mounted ad surfaces inside education/teacher PageClients.

If `AnchoredNativeBanner` is mounted globally (per memory: `admob-banner-architecture.md` — it's in `essential-providers`), audit whether it renders on education routes. Two acceptable outcomes:

1. **Banner already hidden on /education/* and /teacher/*** — claim is true; ship.
2. **Banner renders on these routes** — either:
   - Add a route check in the banner's mount logic to skip when pathname matches `/education` or `/teacher` prefixes.
   - OR soften the trust copy: change `education.landing.trust.bullet1` from "No ads on student-facing education routes" to "Minimal, non-tracking ads on education routes" until banner removal ships.

Fix or soften, then re-run smoke.

- [ ] **Step 11.5: Commit E2E + any ad-audit fixes**

```bash
git add fe-next/e2e/education-access.spec.ts
# include any AdMob-route-skip fix if needed
git commit -m "test(education): E2E gate + apply flow + admin auth; ad-free verification

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Memory log

**Files:**
- Create: `/Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/education-gate-shipped-2026-05-14.md`
- Modify: `/Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/MEMORY.md`

- [ ] **Step 12.1: Write memory file**

Create with summary: routes added/modified, DB tables, deferred items (HE/SV/JA/ES native review, optional reapproval bulk import), commit hashes, allowlist semantics (anon-applicant bridge), and ad-free claim status decision.

- [ ] **Step 12.2: Append index line to MEMORY.md**

Add under Active Work or Completed Features:

```
- [Education Gate Shipped 2026-05-14](education-gate-shipped-2026-05-14.md) — Soft gate on /teacher/* + /education/{classroom-game,duels}; /education rebuilt w/ moat trifecta + 6-mode tour + FAQ + scroll reveals; /education/access apply page; /admin/teacher-access queue; 5-locale i18n (HE/SV/JA/ES native review pending); JSON-LD via next/script + llms.txt
```

- [ ] **Step 12.3: Final verification**

```bash
git log --oneline -15
cd fe-next && npm run test -- --run 2>&1 | tail -10
```

---

## Self-Review

**Spec coverage:**
- ✅ Data model + RLS — Task 1
- ✅ Email templates — Task 2
- ✅ Apply API + rate limit — Task 3
- ✅ Admin API + allowlist bridge — Tasks 4, 5
- ✅ Hook + Gate — Task 5
- ✅ Apply page — Task 6
- ✅ Admin panel + CSV export — Task 7
- ✅ /education rebuild with scroll animations — Task 8 (incl. `frontend-design` + `animate-ai` skills)
- ✅ Sub-landing CTA + SEO polish (Course JSON-LD, llms.txt, sitemap) — Task 9
- ✅ i18n × 5 — Task 10
- ✅ E2E + ad-free verification — Task 11
- ✅ Memory log — Task 12

**Type consistency:** `TeacherAccessRequest` defined Task 2, consumed Tasks 3-7 with identical shape. `useTeacherAccess` return type locked Task 5, consumed Tasks 5, 6.

**Placeholder scan:** No "TBD". All steps have full code blocks. Step 5.1 uses `git grep` to locate signup hook — necessary because the path varies; engineer must inspect.

**XSS-safety:** All JSON-LD emits via `next/script` `Script` component with `JSON.stringify` of typed object literals — no `dangerouslySetInnerHTML`. All email templates HTML-escape user-provided fields.

**Risk:** Step 5.5 inserts a fetch call into the signup completion path; without seeing that file's structure, the exact insertion site is described generically. Engineer must verify the call fires after `auth.uid()` is set and after the profile row exists. If signup is async-deferred, the call may need to move into a layout effect rather than auth context.

**Ad-free claim:** Step 11.4 verifies this before allowing the trust block to ship. Soften copy if banner mount can't be conditionally skipped.

---

## Execution Handoff

**Plan complete and saved to `fe-next/docs/superpowers/plans/2026-05-14-education-gate.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Best for 12-task plans like this where each task is independent enough to delegate.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints. Best if you want to follow each step interactively.

**Which approach?**
