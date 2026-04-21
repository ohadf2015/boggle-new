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
});
