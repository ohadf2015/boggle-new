import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FlowContinueBar } from '../FlowContinueBar';

// The bar reads the flow session once when `active` flips true. Unlike
// DailyFlowController and DailyChallengeLanding, it never listened for
// visibilitychange — so progress shown here goes stale if the underlying
// session changes while this results screen stays mounted (e.g. the flow
// gets paused/resumed in another tab, or completion syncs in late).

vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode };
    return <div {...rest}>{children}</div>;
  } }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string, params?: Record<string, string | number>) => {
      if (!fallback) return _key;
      if (!params) return fallback;
      return fallback.replace(/\{(\w+)\}/g, (m, k) => String(params[k] ?? m));
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

const sessionMock = vi.fn();
vi.mock('@/utils/dailyChallenge/flow', () => ({
  getDailyFlowSession: () => sessionMock(),
  nextFlowStep: () => 'word-wheel',
  flowProgress: (session: { steps: string[] }) => ({ done: 1, total: session.steps.length }),
  isFlowComplete: () => false,
}));

vi.mock('../flowSteps', () => ({
  readPlayedMap: () => ({}),
}));

describe('FlowContinueBar — stays in sync with the live session', () => {
  beforeEach(() => {
    sessionMock.mockReset();
    document.dispatchEvent(new Event('visibilitychange'));
  });

  it('re-reads the session when the tab becomes visible again', () => {
    sessionMock.mockReturnValue({ steps: ['word-hunt', 'word-wheel'], language: 'en' });
    render(<FlowContinueBar active />);
    expect(screen.getByText('1 of 2 cleared')).toBeInTheDocument();

    // Session changed in another tab (e.g. a third step got added) while this
    // results screen stayed mounted — simulate the tab regaining focus.
    sessionMock.mockReturnValue({ steps: ['word-hunt', 'word-wheel', 'word-tower'], language: 'en' });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('1 of 3 cleared')).toBeInTheDocument();
  });
});
