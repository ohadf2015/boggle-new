/**
 * Filters $exception events that arrive with no usable payload (cross-origin
 * "Script error.", rejected non-Error values, etc). Keeps event quota clean
 * and prevents noise in PostHog error tracking.
 */

import { filterEmptyException } from '../posthogExceptionFilter';

describe('filterEmptyException', () => {
  it('returns non-exception events unchanged', () => {
    const event = { event: '$pageview', properties: { $current_url: '/x' } };
    expect(filterEmptyException(event as never)).toBe(event);
  });

  it('drops $exception events with empty exception_list', () => {
    const event = {
      event: '$exception',
      properties: { $exception_list: [] },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('drops $exception events missing exception_list', () => {
    const event = {
      event: '$exception',
      properties: {},
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('drops $exception when first entry has null type and null value', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [{ type: null, value: null }],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('drops generic cross-origin "Script error." with no stack', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [{ type: 'Error', value: 'Script error.', stacktrace: null }],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('keeps $exception with real type + message', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [{ type: 'TypeError', value: 'x is undefined' }],
      },
    };
    expect(filterEmptyException(event as never)).toBe(event);
  });

  it('returns null for null event', () => {
    expect(filterEmptyException(null)).toBeNull();
  });

  // Regression: PostHog recorded 113× "Unable to convert color -1" from
  // custom-pixi-particles internals on /he/blast over 30d. Sentry already
  // suppresses this via ignoreErrors; parity in PostHog keeps noise out.
  it('drops Pixi "Unable to convert color" exceptions', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          { type: 'Error', value: 'Unable to convert color -1' },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('drops variant "Unable to convert color" messages regardless of suffix', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          { type: 'Error', value: 'Unable to convert color NaN' },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  // Regression: 48× benign Supabase `navigator.locks` AbortError on /he/daily.
  // Lock steal on tab visibility change is expected; not a real error.
  it('drops Supabase navigator.locks AbortError noise', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          {
            type: 'AbortError',
            value: 'The operation was aborted.',
            stacktrace: { frames: [{ filename: 'supabase/auth-js/GoTrueClient' }] },
          },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  // Regression: 13+ events 30d showed `type='DOMException'` (not 'AbortError')
  // with value containing `Lock broken by another request with the 'steal' option`.
  // Old filter checked type === 'AbortError' only and missed these.
  it('drops Supabase lock-stolen DOMException by message pattern', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          {
            type: 'DOMException',
            value: "AbortError: Lock broken by another request with the 'steal' option.",
            stacktrace: { frames: [{ filename: 'app/layout.tsx' }] },
          },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  // Regression: 16+ events 30d showed `type='Error'` with value
  // `Lock "lock:sb-hdtmpkicuxvtmvrmtybx-auth-token" was released because another request stole it`.
  it('drops Supabase auth-token lock-released Error by message pattern', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          {
            type: 'Error',
            value: 'Lock "lock:sb-hdtmpkicuxvtmvrmtybx-auth-token" was released because another request stole it',
            stacktrace: { frames: [{ filename: 'app/layout.tsx' }] },
          },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBeNull();
  });

  it('keeps unrelated AbortError (not from Supabase lock)', () => {
    const event = {
      event: '$exception',
      properties: {
        $exception_list: [
          {
            type: 'AbortError',
            value: 'fetch aborted',
            stacktrace: { frames: [{ filename: 'api/route.ts' }] },
          },
        ],
      },
    };
    expect(filterEmptyException(event as never)).toBe(event);
  });
});
