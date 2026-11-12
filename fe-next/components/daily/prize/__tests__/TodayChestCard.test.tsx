import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { useAuth, getWithAuth } = vi.hoisted(() => ({ useAuth: vi.fn(), getWithAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: vi.fn(), getWithAuth }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { TodayChestCard, todayChestKind } from '../TodayChestCard';

const NONE = { wordWheel: false, wordHunt: false, wordTower: false, connections: false };
const today = () => new Date().toISOString().slice(0, 10);
const shut = () => getWithAuth.mockResolvedValue(new Response(JSON.stringify({ fixed: false, opened: null }), { status: 200 }));

describe('TodayChestCard: one chest a day', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
    shut();
  });

  it('given neither main puzzle is done, then it is locked, says what is left, and has no Open button', () => {
    render(<TodayChestCard progress={NONE} />);
    expect(screen.getByTestId('today-chest-locked')).toBeTruthy();
    expect(screen.getByTestId('today-chest-todo').textContent).toContain('wordWheel.hub.wordWheelQuest');
    expect(screen.getByTestId('today-chest-todo').textContent).toContain('daily.wordHunt.title');
    expect(screen.getByTestId('today-chest-progress').textContent).toContain('"done":0');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('given only Word Hunt is left, then it names just that one', () => {
    render(<TodayChestCard progress={{ ...NONE, wordWheel: true }} />);
    const todo = screen.getByTestId('today-chest-todo').textContent ?? '';
    expect(todo).toContain('daily.wordHunt.title');
    expect(todo).not.toContain('wordWheel.hub.wordWheelQuest');
  });

  it('given the two main puzzles are done, then it opens as the day box and suggests the bigger one', () => {
    render(<TodayChestCard progress={{ ...NONE, wordWheel: true, wordHunt: true }} />);
    const ready = screen.getByTestId('today-chest-ready');
    expect(ready.getAttribute('data-kind')).toBe('clear');
    expect(screen.getByTestId('today-chest-upgrade')).toBeTruthy();
  });

  it('given all four are done, then it is the bigger chest', () => {
    const all = { wordWheel: true, wordHunt: true, wordTower: true, connections: true };
    expect(todayChestKind(all)).toBe('perfect');
    render(<TodayChestCard progress={all} />);
    expect(screen.getByTestId('today-chest-ready').getAttribute('data-kind')).toBe('perfect');
    expect(screen.queryByTestId('today-chest-upgrade')).toBeNull();
  });

  it('given the chest was opened on this device, then it shows what it held and when the next one comes', () => {
    localStorage.setItem(`lc:day-prize:clear:${today()}`, JSON.stringify({ kind: 'clear', tier: 'lucky', coins: 50, xp: 50, claimed: true }));
    render(<TodayChestCard progress={{ ...NONE, wordWheel: true, wordHunt: true }} />);
    expect(screen.getByTestId('today-chest-opened').textContent).toContain('"coins":50');
    expect(screen.getByTestId('today-chest-next')).toBeTruthy();
    expect(screen.queryByTestId('today-chest-ready')).toBeNull();
  });

  it('given the chest was opened on another device, then the server answer shows it as opened', async () => {
    getWithAuth.mockResolvedValue(new Response(JSON.stringify({
      fixed: false,
      opened: { kind: 'perfect', tier: 'common', coins: 60, xp: 100, claimed: false, fixed: false },
    }), { status: 200 }));
    render(<TodayChestCard progress={{ wordWheel: true, wordHunt: true, wordTower: true, connections: true }} />);
    await waitFor(() => expect(screen.getByTestId('today-chest-opened').textContent).toContain('"coins":60'));
    expect(localStorage.getItem(`lc:day-prize:perfect:${today()}`)).toContain('"coins":60');
  });

  it('guests see what signing in would get them', () => {
    useAuth.mockReturnValue({ user: null });
    render(<TodayChestCard progress={NONE} />);
    expect(screen.getByTestId('today-chest-guest')).toBeTruthy();
  });
});
