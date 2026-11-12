import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let params = new URLSearchParams();
const hubProps = vi.fn();

vi.mock('next/navigation', () => ({ useSearchParams: () => params }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ language: 'he' }) }));
vi.mock('@/components/quick-play/QuickPlayHub', () => ({
  QuickPlayHub: (props: Record<string, unknown>) => {
    hubProps(props);
    return null;
  },
}));

// The live-class banner has its own tests; here it only must not need auth or a socket.
vi.mock('@/components/student/ClassLiveGameBanner', () => ({ ClassLiveGameBanner: () => null }));

import StudentQuickPlayPageClient from '../PageClient';
import { isEduAppSurface } from '@/lib/navigation/eduAppSurface';
import { isAdFreeRoute, isAllowedAdBannerRoute } from '@/lib/admob-routes';

beforeEach(() => hubProps.mockReset());

describe('student quick play', () => {
  it('is a classroom surface, so the player tab bar never mounts', () => {
    expect(isEduAppSurface('/he/student/quick-play')).toBe(true);
  });

  it('carries no ads, like the rest of the student app', () => {
    expect(isAdFreeRoute('/he/student/quick-play')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/student/quick-play?from=late_join', new URLSearchParams('from=late_join'))).toBe(false);
  });

  it('Given the Academy opened it, Then back returns to the Academy', () => {
    params = new URLSearchParams();
    render(<StudentQuickPlayPageClient />);
    expect(hubProps).toHaveBeenLastCalledWith(expect.objectContaining({ backHref: '/he/student', challengeId: null }));
  });

  it('Given a late joiner opened it, Then back returns to the class code entry', () => {
    params = new URLSearchParams('from=late_join');
    render(<StudentQuickPlayPageClient />);
    expect(hubProps).toHaveBeenLastCalledWith(expect.objectContaining({ backHref: '/he/join' }));
  });
});
