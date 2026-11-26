/**
 * Keep Accept-Language and Cookie on Vary for locale-negotiated responses.
 *
 * Express used to set those tokens once on the bare `/` rewrite, but Next's
 * renderer later overwrites Vary with its RSC list (rsc, next-router-state-tree,
 * …, Accept-Encoding). Without Accept-Language and Cookie in the final header,
 * a shared cache can serve the Hebrew homepage to an English-preferring visitor
 * (and the reverse).
 *
 * Wrap the response writers so every later Vary — setHeader, appendHeader, or
 * writeHead — is merged rather than replaced. Idempotent: pinning twice is a
 * no-op.
 */
import { mergeVary } from '../lib/localeResolution';

export const LOCALE_VARY_TOKENS = 'Accept-Language, Cookie';

const PINNED = Symbol.for('lc.localeVaryPinned');

const SKIP_PREFIXES = ['/api', '/_next', '/lcx', '/favicon', '/robots', '/sitemap', '/manifest'];
const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

type Pinnable = {
  setHeader?: (name: string, value: unknown) => unknown;
  appendHeader?: (name: string, value: string) => unknown;
  getHeader?: (name: string) => unknown;
  writeHead?: (...args: unknown[]) => unknown;
  [PINNED]?: boolean;
};

function asVaryInput(value: unknown): string | string[] | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' || Array.isArray(value)) return value;
  return undefined;
}

function merged(value: unknown): string {
  return mergeVary(asVaryInput(value), LOCALE_VARY_TOKENS);
}

function varyKey(headers: Record<string, unknown>): string | undefined {
  return Object.keys(headers).find((k) => k.toLowerCase() === 'vary');
}

function mergeHeadersObject(headers: Record<string, unknown>, existing?: unknown): Record<string, unknown> {
  const next = { ...headers };
  const key = varyKey(next);
  if (key) {
    next[key] = merged(next[key]);
  } else {
    next.Vary = merged(existing);
  }
  return next;
}

/**
 * True for paths whose locale is negotiated (not already in the URL):
 * `/`, `/multiplayer`, `/singleplayer`, `/legal/privacy`, etc.
 * Prefixed pages, APIs, and assets are left alone.
 */
export function shouldPinLocaleVary(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0] || '/';
  if (SKIP_PREFIXES.some((prefix) =>
    path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}.`)
  )) {
    return false;
  }
  const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
  if (lastSegment.includes('.')) return false;
  const first = path.split('/').filter(Boolean)[0];
  if (first && LOCALES.has(first)) return false;
  return true;
}

export function pinLocaleVary(res: Pinnable): void {
  if (res[PINNED]) return;
  res[PINNED] = true;

  const originalSet = res.setHeader?.bind(res);
  const originalAppend = res.appendHeader?.bind(res);
  const originalWriteHead = res.writeHead?.bind(res);
  const originalGet = res.getHeader?.bind(res);

  if (originalSet) {
    res.setHeader = (name: string, value: unknown) => {
      if (name.toLowerCase() === 'vary') value = merged(value);
      return originalSet(name, value);
    };
  }

  if (originalAppend) {
    res.appendHeader = (name: string, value: string) => {
      if (name.toLowerCase() === 'vary') value = merged(value);
      return originalAppend(name, value);
    };
  }

  if (originalWriteHead) {
    res.writeHead = (...args: unknown[]) => {
      const existing = originalGet ? originalGet('Vary') : undefined;
      // writeHead(status, headers) or writeHead(status, statusMessage, headers)
      if (args[1] && typeof args[1] === 'object' && !Array.isArray(args[1])) {
        args[1] = mergeHeadersObject(args[1] as Record<string, unknown>, existing);
      } else if (args[2] && typeof args[2] === 'object' && !Array.isArray(args[2])) {
        args[2] = mergeHeadersObject(args[2] as Record<string, unknown>, existing);
      }
      return originalWriteHead(...args);
    };
  }

  if (originalSet) {
    originalSet('Vary', merged(originalGet ? originalGet('Vary') : undefined));
  }
}
