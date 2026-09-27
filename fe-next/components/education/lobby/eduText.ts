/**
 * `t` with an English fallback that survives BOTH translator shapes in use.
 *
 * The context translator is `t(key, fallback?, params?)`, but several live
 * surfaces (the projector, the TV recap) receive a narrower `t(key, params?)`
 * prop from the host tree. Passing a fallback string to the narrow one would be
 * read as params and the raw key would reach the wall — a rawKeys failure on a
 * projector. So: call it the wide way, and if what comes back is still the key
 * (missing translation, or a narrow translator), print the English fallback.
 */

export type EduParams = Record<string, string | number>;
export type EduT = (path: string, params?: EduParams) => string;
type WideT = (path: string, fallbackOrParams?: string | EduParams, params?: EduParams) => string;

export function interpolate(text: string, params?: EduParams): string {
  if (!params) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g, (match, a: string | undefined, b: string | undefined) => {
    const name = (a ?? b) as string;
    return name in params ? String(params[name]) : match;
  });
}

export function tr(t: EduT | WideT, key: string, fallback: string, params?: EduParams): string {
  let out: unknown;
  try {
    out = (t as WideT)(key, fallback, params);
  } catch {
    out = null;
  }
  if (typeof out !== 'string' || !out || out.startsWith(key)) return interpolate(fallback, params);
  return out;
}
