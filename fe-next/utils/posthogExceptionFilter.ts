/**
 * Drop $exception events with no usable payload. Prior to this filter PostHog
 * was recording dozens of $exception events per day with null type/message —
 * mostly cross-origin "Script error." and thrown non-Error values — that
 * pollute error tracking and waste event quota.
 */

interface PostHogEventLike {
  event?: string;
  properties?: Record<string, unknown>;
}

interface StacktraceFrame {
  filename?: string | null;
}

interface Stacktrace {
  frames?: StacktraceFrame[];
}

interface ExceptionListEntry {
  type?: string | null;
  value?: string | null;
  stacktrace?: Stacktrace | unknown;
}

const NOISE_VALUE_PATTERNS: RegExp[] = [
  /Unable to convert color/i,
];

// Multi-tab Supabase auth-token lock contention. Three observed shapes:
//   1. type=AbortError, message=The operation was aborted (frames in supabase/auth-js)
//   2. type=DOMException, message=AbortError: Lock broken by another request with the 'steal' option
//   3. type=Error, message=Lock "lock:sb-<id>-auth-token" was released because another request stole it
// All three are normal multi-tab token-refresh races, not real failures.
const SUPABASE_LOCK_MESSAGE_PATTERNS: RegExp[] = [
  /Lock broken by another request with the 'steal' option/i,
  /Lock "lock:sb-[\w-]+-auth-token" was released because another request stole it/i,
];

function isSupabaseLockAbort(entry: ExceptionListEntry): boolean {
  const value = typeof entry?.value === 'string' ? entry.value : '';
  if (SUPABASE_LOCK_MESSAGE_PATTERNS.some((re) => re.test(value))) return true;

  if (entry?.type !== 'AbortError') return false;
  const frames = (entry.stacktrace as Stacktrace | undefined)?.frames;
  if (!Array.isArray(frames)) return false;
  return frames.some((f) =>
    typeof f?.filename === 'string' &&
    /supabase|GoTrueClient|auth-js/i.test(f.filename),
  );
}

export function filterEmptyException<T extends PostHogEventLike | null>(
  event: T,
): T | null {
  if (!event || event.event !== '$exception') return event;

  const list = event.properties?.$exception_list as ExceptionListEntry[] | undefined;
  if (!Array.isArray(list) || list.length === 0) return null;

  const first = list[0];
  const type = first?.type;
  const value = first?.value;

  if (!type && !value) return null;
  if (value === 'Script error.' && !first?.stacktrace) return null;

  if (typeof value === 'string' && NOISE_VALUE_PATTERNS.some((re) => re.test(value))) {
    return null;
  }

  if (isSupabaseLockAbort(first)) return null;

  return event;
}
