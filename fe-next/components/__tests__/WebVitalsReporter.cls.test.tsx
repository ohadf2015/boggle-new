import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

type Cb = (m: Record<string, unknown>) => void;
const handlers: { cls?: Cb; inp?: Cb; next?: Cb } = {};
vi.mock('web-vitals/attribution', () => ({
  onINP: (cb: Cb) => { handlers.inp = cb; },
  onCLS: (cb: Cb) => { handlers.cls = cb; },
}));
vi.mock('next/web-vitals', () => ({ useReportWebVitals: (cb: Cb) => { handlers.next = cb; } }));
vi.mock('../GoogleAnalytics', () => ({ trackEvent: vi.fn() }));

import { WebVitalsReporter } from '../WebVitalsReporter';

const bodies = () =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([url]) => url === '/api/web-vitals')
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe('WebVitalsReporter CLS', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}')) as unknown as typeof fetch;
  });

  it('stores CLS once, with the element that shifted most', () => {
    render(<WebVitalsReporter />);
    handlers.cls!({
      name: 'CLS', value: 0.33, rating: 'poor', delta: 0.33, id: 'v5-cls', navigationType: 'navigate',
      attribution: { largestShiftTarget: 'div.mp-results>section', largestShiftTime: 4210.6, largestShiftValue: 0.21, loadState: 'complete' },
    });
    handlers.next!({ name: 'CLS', value: 0.33, rating: 'poor', delta: 0.33, id: 'v4-cls' });

    const cls = bodies().filter((b) => b.metric_name === 'CLS');
    expect(cls).toHaveLength(1);
    expect(cls[0].metadata.clsAttribution).toEqual({
      target: 'div.mp-results>section', time: 4211, value: 0.21, loadState: 'complete',
    });
  });
});
