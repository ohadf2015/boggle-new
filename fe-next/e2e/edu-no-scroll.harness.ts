import type { BrowserContext, Page, Route } from '@playwright/test';
import { SignJWT } from 'jose';

export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'projector', width: 1366, height: 768 },
] as const;

export const LOCALES = ['en', 'he', 'ru'] as const;

export type HubPersona = 'student-full' | 'student-empty' | 'guest' | 'teacher';

const USER_ID = '00000000-0000-4000-8000-00000000e2e5';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000c1a55';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

function lesson(i: number) {
  return {
    id: `e2e-lesson-${i}`,
    name: ['Animals and their habitats', 'Weather words', 'Kitchen verbs'][i % 3],
    description: null,
    language: 'en',
    words: ['habitat', 'predator', 'migrate', 'burrow', 'nocturnal'].map((word) => ({ word })),
    classroom_id: CLASSROOM_ID,
    assignment: i === 0
      ? { lesson_id: `e2e-lesson-${i}`, classroom_id: CLASSROOM_ID, due_date: new Date(Date.now() + 86_400_000).toISOString() }
      : null,
  };
}

async function projectRef(page: Page, baseURL: string): Promise<string> {
  const html = await (await page.request.get(`${baseURL}/en/education`)).text();
  const ref = html.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!ref) throw new Error('Supabase project ref not found in the page');
  return ref;
}

/**
 * A forged session the browser reads from its cookie. Every Supabase call the
 * page makes is answered here and every write is refused, so no test touches a
 * real project.
 */
export async function signInAs(context: BrowserContext, page: Page, baseURL: string, persona: HubPersona) {
  const isGuest = persona === 'guest';
  const role = persona === 'teacher' ? 'teacher' : 'student';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access = await new SignJWT({ sub: USER_ID, role: 'authenticated', is_anonymous: isGuest })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode('e2e-forged-not-the-project-secret-32'));
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: isGuest ? undefined : 'kid@lexiclash.test',
    is_anonymous: isGuest,
    app_metadata: { provider: isGuest ? 'anonymous' : 'email' },
    user_metadata: { username: 'Maya' },
    created_at: '2026-10-01T00:00:00Z',
  };
  const session = { access_token: access, refresh_token: 'e2e', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
  const ref = await projectRef(page, baseURL);
  const url = new URL(baseURL);
  await context.addCookies([{
    name: `sb-${ref}-auth-token`,
    value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
    domain: url.hostname,
    path: '/',
  }]);

  const profile = {
    id: USER_ID,
    username: 'Maya',
    display_name: 'Maya',
    user_role: role,
    is_admin: false,
    total_xp: persona === 'student-full' ? 1840 : 0,
    avatar_config: null,
    onboarding_completed: true,
    preferred_language: 'en',
  };
  const full = persona === 'student-full';

  await context.route(/\.supabase\.co\//, (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.pathname.startsWith('/auth/v1/user')) return json(route, user);
    if (u.pathname.startsWith('/auth/v1/')) return json(route, {});
    if (req.method() !== 'GET' && req.method() !== 'HEAD') return json(route, null, 201);
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const table = u.pathname.replace('/rest/v1/', '');
    if (table === 'profiles') return json(route, single ? profile : [profile]);
    if (table === 'classroom_memberships') {
      const row = full
        ? { student_id: USER_ID, classroom_id: CLASSROOM_ID, level: 'core', joined_at: '2026-10-02T00:00:00Z', classrooms: { id: CLASSROOM_ID, teacher_id: 't', name: 'Class 5B Explorers', join_code: 'ABC123', language: 'en', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' } }
        : null;
      return json(route, single ? row : row ? [row] : []);
    }
    return json(route, single ? null : []);
  });

  await context.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === '/api/education/practice/lessons') return json(route, { lessons: full ? [0, 1, 2].map(lesson) : [] });
    if (path === '/api/streak') return json(route, full ? { currentStreak: 4, longestStreak: 6, lastWinDate: new Date(Date.now() - 86_400_000).toISOString() } : { currentStreak: 0 });
    if (path.startsWith('/api/education/spaced-repetition')) return json(route, { words: [], progress: [] });
    if (path.includes('/hub')) return json(route, { classroom: { id: CLASSROOM_ID, name: 'Class 5B Explorers' }, standings: [], members: [] });
    if (req.method() !== 'GET') return json(route, { ok: true });
    return json(route, {});
  });
}

export interface FitReport {
  url: string;
  scrollHeight: number;
  innerHeight: number;
  scrollWidth: number;
  innerWidth: number;
  dir: string;
  /** Inner scroll regions holding content the student cannot see without scrolling. */
  hiddenScrollers: string[];
  /** Key controls whose box leaves the viewport. */
  offscreen: string[];
}

export async function measureFit(page: Page, keys: string[]): Promise<FitReport> {
  return page.evaluate((testIds) => {
    const se = document.scrollingElement ?? document.documentElement;
    const hiddenScrollers: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0) {
        hiddenScrollers.push(`${el.tagName.toLowerCase()}[data-testid=${el.dataset.testid ?? ''}].${String(el.className).slice(0, 60)} ${el.scrollHeight}/${el.clientHeight}`);
      }
    }
    const offscreen: string[] = [];
    for (const id of testIds) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) { offscreen.push(`${id}:missing`); continue; }
      const r = el.getBoundingClientRect();
      if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) offscreen.push(`${id}:${Math.round(r.top)},${Math.round(r.bottom)}`);
    }
    return {
      url: location.pathname,
      scrollHeight: se.scrollHeight,
      innerHeight,
      scrollWidth: se.scrollWidth,
      innerWidth,
      dir: document.documentElement.dir,
      hiddenScrollers,
      offscreen,
    };
  }, keys);
}

/** rAF deltas recorded in the page until `stopRecording` is called. */
export async function startFrameRecording(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __rafDeltas: number[]; __rafStop: boolean };
    w.__rafDeltas = [];
    w.__rafStop = false;
    let last = performance.now();
    const tick = (now: number) => {
      w.__rafDeltas.push(now - last);
      last = now;
      if (!w.__rafStop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export async function stopFrameRecording(page: Page) {
  const deltas = await page.evaluate(() => {
    const w = window as unknown as { __rafDeltas: number[]; __rafStop: boolean };
    w.__rafStop = true;
    return w.__rafDeltas.slice(1);
  });
  const sorted = [...deltas].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  return { frames: deltas.length, max: Math.round(sorted[sorted.length - 1] ?? 0), p95: Math.round(p95), over50: deltas.filter((d) => d > 50).length };
}

export async function observeLayoutShift(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* not supported */ }
  });
}

export const readLayoutShift = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls ?? 0);
