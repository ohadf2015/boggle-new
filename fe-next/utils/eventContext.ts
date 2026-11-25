const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const LANDING_KEY = 'lexiclash_landing_ctx';

function currentPage(): Record<string, string> {
  const ctx: Record<string, string> = {};
  const loc = window.location;
  if (loc?.pathname) ctx.page = loc.pathname;
  const qs = new URLSearchParams(loc?.search || '');
  for (const key of UTM_KEYS) {
    const v = qs.get(key);
    if (v) ctx[key] = v.slice(0, 100);
  }
  const doc = window.document;
  if (doc?.title) ctx.page_title = String(doc.title).slice(0, 120);
  try {
    const host = doc?.referrer ? new URL(doc.referrer).hostname : '';
    if (host && host !== loc?.hostname) ctx.referrer_host = host;
  } catch {
    /* malformed referrer */
  }
  return ctx;
}

/** First page of this visit, stored once per session and never overwritten. */
function landing(current: Record<string, string>): Record<string, string> {
  try {
    const stored = globalThis.sessionStorage?.getItem(LANDING_KEY);
    if (stored) return JSON.parse(stored) as Record<string, string>;
  } catch {
    /* storage blocked or corrupt: fall back to this page */
  }
  const first: Record<string, string> = {};
  if (current.page) first.landing_page = current.page;
  if (current.referrer_host) first.landing_referrer_host = current.referrer_host;
  for (const key of UTM_KEYS) if (current[key]) first[key] = current[key];
  try {
    globalThis.sessionStorage?.setItem(LANDING_KEY, JSON.stringify(first));
  } catch {
    /* storage blocked */
  }
  return first;
}

/** Where the event fired (page, title, referrer, utm_*) plus the visit's landing_page, landing_referrer_host and first-page utm_*. Never throws. */
export function pageContext(): Record<string, string> {
  try {
    if (typeof window === 'undefined') return {};
    const current = currentPage();
    const first = landing(current);
    return { ...first, landing_page: first.landing_page || current.page || '', ...current };
  } catch {
    return {};
  }
}

const ATTRIBUTION_KEYS = ['page', 'landing_page', 'landing_referrer_host', ...UTM_KEYS] as const;

/** The attribution subset a server-side event carries: client sends it with the request, server keeps known keys only. */
export function attribution(): Record<string, string> {
  return cleanAttribution(pageContext());
}

/** `{ attribution }` for a request body, or nothing when there is no page context (server, tests). */
export function attributionBody(): { attribution?: Record<string, string> } {
  const attr = attribution();
  return Object.keys(attr).length ? { attribution: attr } : {};
}

export function cleanAttribution(input: unknown): Record<string, string> {
  const src = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = src[key];
    if (typeof v !== 'string' || !v || v.length > 120) continue;
    if ((key === 'page' || key === 'landing_page') && !v.startsWith('/')) continue;
    out[key] = v;
  }
  return out;
}

const SPECIFIC_PHASE: Record<string, string> = { game_started: 'started', game_completed: 'completed' };
const SLUG = /^[a-z][a-z0-9_]{0,23}$/;

/** game_started/game_completed → <mode>_game_<phase>, mp_ prefixed for multiplayer rooms; null for other events. */
export function specificGameEventName(event: string, data: Record<string, unknown>): string | null {
  const phase = SPECIFIC_PHASE[event];
  if (!phase) return null;
  let slug = String(data.mode ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!SLUG.test(slug)) slug = 'other';
  const multiplayer = data.isMultiplayer === true || data.engineMode === 'multiplayer';
  if (multiplayer && slug !== 'multiplayer') slug = `mp_${slug}`;
  return `${slug}_game_${phase}`;
}

export const SPECIFIC_GAME_EVENT = /^[a-z0-9_]+_game_(started|completed)$/;
