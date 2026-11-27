import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { ProjectorLessonClaims } from '../ProjectorLessonClaims';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const slots = (n: number) => Array.from({ length: n }, (_, index) => ({ index, first: 'ABCDEFGHIJKL'[index], length: 5, claim: null }));

describe('ProjectorLessonClaims capacity', () => {
  afterEach(() => {
    cleanup();
    act(() => ingestLessonClaimsRound({}));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('Given the wall mounts before the race arrives, When 12 words land on a short wall, Then the overflow folds into a +N tile instead of being clipped', () => {
    vi.stubGlobal('ResizeObserver', class { constructor(private cb: () => void) {} observe() { this.cb(); } disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(32);
    render(<ProjectorLessonClaims t={t} />);
    act(() => ingestLessonClaimsRound({ lessonClaims: { roundId: 4, total: 12, claimedCount: 0, slots: slots(12) } }));
    expect(screen.getByTestId('claim-tiles-more')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThan(12);
  });
});
