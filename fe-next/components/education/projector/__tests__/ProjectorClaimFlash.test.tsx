import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => reduced.value }));

import { CLAIM_FLASH_MS, ProjectorClaimFlash } from '../ProjectorClaimFlash';
import { ingestLessonClaim, ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const view = { roundId: 7, total: 3, claimedCount: 0, slots: [0, 1, 2].map((index) => ({ index, first: 'P', length: 6, claim: null })) };
const claim = (index: number, username: string, word = 'planet') =>
  ingestLessonClaim({ roundId: 7, index, word, username, avatar: null, teamId: null, claimedCount: index + 1, total: 3, bonus: 3 });

describe('ProjectorClaimFlash — a race word claim gets the whole wall for a moment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduced.value = false;
    act(() => ingestLessonClaimsRound({ lessonClaims: view }));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    act(() => ingestLessonClaimsRound(null));
  });

  it('Given the wall mounts after claims already happened, Then nothing flashes', () => {
    act(() => claim(0, 'Noa'));
    render(<ProjectorClaimFlash t={t} />);
    expect(screen.queryByTestId('projector-claim-flash')).toBeNull();
  });

  it('Given a new claim, Then the flash names the word and the claimer, then clears', () => {
    render(<ProjectorClaimFlash t={t} />);
    act(() => claim(1, 'Maximiliana-Josefina'));
    const flash = screen.getByTestId('projector-claim-flash');
    expect(flash).toHaveTextContent(/planet/i);
    expect(flash).toHaveTextContent('Maximiliana-Josefina');
    expect(flash.className).not.toMatch(/opacity-0/);
    act(() => vi.advanceTimersByTime(CLAIM_FLASH_MS + 50));
    expect(screen.queryByTestId('projector-claim-flash')).toBeNull();
  });

  it('Given two claims land close together, Then one flash shows the latest and restarts its clock', () => {
    render(<ProjectorClaimFlash t={t} />);
    act(() => claim(0, 'Noa'));
    act(() => vi.advanceTimersByTime(CLAIM_FLASH_MS - 200));
    act(() => claim(1, 'Leo', 'magnet'));
    expect(screen.getAllByTestId('projector-claim-flash')).toHaveLength(1);
    expect(screen.getByTestId('projector-claim-flash')).toHaveTextContent('Leo');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId('projector-claim-flash')).toBeInTheDocument();
  });

  it('Given reduced motion, Then no flash at all', () => {
    reduced.value = true;
    render(<ProjectorClaimFlash t={t} />);
    act(() => claim(2, 'Noa'));
    expect(screen.queryByTestId('projector-claim-flash')).toBeNull();
  });
});
