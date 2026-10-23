import { renderHook } from '@testing-library/react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he' }) }));

import { useMpExit } from '@/hooks/useMpExit';

describe('useMpExit outside the MP page, on the classroom live route', () => {
  beforeEach(() => {
    push.mockReset();
    window.history.pushState({}, '', '/he/education/live?room=ABC');
  });
  afterEach(() => window.history.pushState({}, '', '/'));

  it.each(['back-from-entry', 'continue-solo', 'room-gone', 'error'] as const)('%s stays inside edu', (reason) => {
    const { result } = renderHook(() => useMpExit());
    result.current(reason);
    expect(push).toHaveBeenCalledWith('/he/student');
  });
});
