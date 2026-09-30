import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/Avatar', () => ({ default: () => null }));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => null }));
const getWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (...a: unknown[]) => getWithAuth(...a) }));

import { DailyTowerBoard } from '../DailyTowerBoard';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const row = (rank: number, name: string, m: number, isYou = false) => ({
  rank,
  playerId: `p${rank}`,
  isYou,
  username: name,
  bestHeightM: m,
  floors: Math.round(m / 3),
});

function respond(rows: unknown[]) {
  getWithAuth.mockResolvedValue({ ok: true, json: () => Promise.resolve({ leaderboard: rows }) });
}

beforeEach(() => vi.clearAllMocks());

describe('DailyTowerBoard', () => {
  it('shows the top climbers with the metres they GREW today, medals for the podium', async () => {
    respond([row(1, 'Ana', 30), row(2, 'Bo', 21), row(3, 'Cy', 12), row(4, 'Di', 9)]);
    render(<DailyTowerBoard t={t} language="en" />);
    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('+30wordTowerV2.unitM')).toBeTruthy();
    expect(screen.getByText('🥇')).toBeTruthy();
    expect(screen.getByText('🥉')).toBeTruthy();
  });

  it('keeps YOUR row visible even when you are outside the top five', async () => {
    respond([row(1, 'A', 50), row(2, 'B', 40), row(3, 'C', 30), row(4, 'D', 20), row(5, 'E', 15), row(9, 'Me', 3, true)]);
    render(<DailyTowerBoard t={t} language="en" />);
    expect(await screen.findByText('Me')).toBeTruthy();
    expect(screen.getByText('#9')).toBeTruthy();
  });

  it('says so when nobody has climbed yet, and stays quiet on a failed load', async () => {
    respond([]);
    const { unmount } = render(<DailyTowerBoard t={t} language="en" />);
    expect(await screen.findByText('wordTowerV2.dailyTower.boardEmpty')).toBeTruthy();
    unmount();
    getWithAuth.mockResolvedValue({ ok: false });
    const { container } = render(<DailyTowerBoard t={t} language="en" />);
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledTimes(2));
    expect(container.querySelector('[data-wt2-board]')).toBeNull();
  });
});
