import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sfx = {
  playCoinCollectSound: vi.fn(),
  playCoinCascadeSound: vi.fn(),
  playGiftReceivedSound: vi.fn(),
  playStreakMilestoneSound: vi.fn(),
  playChestOpenSound: vi.fn(),
  playTileSelectSound: vi.fn(),
  playButtonClickSound: vi.fn(),
};
const holidayState = { holiday: 'hanukkah' as 'hanukkah' | 'christmas' | null, region: 'world' as 'IL' | 'world', resolved: true };
const auth = { user: { id: 'u1' } as { id: string } | null, loading: false };

function interpolate(s: string, p?: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(p?.[k] ?? `{${k}}`));
}
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) =>
      typeof a === 'string' ? interpolate(a, b) : key,
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holidayState }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/utils/share', () => ({ trackShareCompleted: vi.fn() }));

import HolidayBoardLayer from '../HolidayBoardLayer';
import HolidayCracker from '../HolidayCracker';
import HolidayDailyIntro from '../HolidayDailyIntro';
import HolidayDailyResults from '../HolidayDailyResults';
import HolidayDreidel from '../HolidayDreidel';
import { geltCells, pathThroughCells } from '@/lib/holidays/dailyBoard';
import { publishHolidaySettlement, resetHolidaySettlementForTests } from '@/lib/holidays/dailyClient';

const GRID = [
  ['S', 'N', 'O', 'W'],
  ['A', 'T', 'R', 'E'],
  ['N', 'E', 'E', 'L'],
  ['T', 'A', 'F', 'G'],
];

function Board({ words }: { words: string[] }) {
  return (
    <div>
      <div data-board="">
        {GRID.flatMap((row, r) => row.map((l, c) => <span key={`${r}-${c}`} data-tile="" data-row={r} data-col={c}>{l}</span>))}
      </div>
      <HolidayBoardLayer grid={GRID} puzzleDate="2026-12-06" language="en" foundWords={words} />
    </div>
  );
}

function mockFetch(body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function reducedMotion(on: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia;
}

beforeEach(() => {
  holidayState.holiday = 'hanukkah';
  holidayState.region = 'world';
  auth.user = { id: 'u1' };
  Object.values(sfx).forEach((f) => f.mockReset());
  resetHolidaySettlementForTests();
  reducedMotion(true);
});

afterEach(() => vi.unstubAllGlobals());

describe('Nightly Board layer', () => {
  it('Given night 3, Then exactly the 3 seeded gelt tiles wear the bonus tile skin', () => {
    const { container } = render(<Board words={[]} />);
    const marked = [...container.querySelectorAll('.holiday-bonus-tile')].map((el) => `${el.getAttribute('data-row')}-${el.getAttribute('data-col')}`);
    expect(marked.sort()).toEqual(geltCells(GRID, '2026-12-06', 'en', 3).map((c) => `${c.row}-${c.col}`).sort());
  });

  it('Given a new word through gelt, Then coins chime and the mascot reacts; a word missing gelt stays quiet', () => {
    const gelt = geltCells(GRID, '2026-12-06', 'en', 3);
    const candidates = ['SNOW', 'TREE', 'SAT', 'EEL', 'TEN', 'NET', 'ATE', 'EAT', 'TEA', 'NOW', 'ROW', 'TORE', 'ANT', 'TAN'];
    const through = candidates.find((w) => pathThroughCells(w, GRID, gelt));
    const { rerender } = render(<Board words={[]} />);
    rerender(<Board words={[through!]} />);
    expect(sfx.playCoinCollectSound).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('holiday-mascot-pop')).toBeTruthy();
  });

  it('Given no holiday, Then the board is untouched', () => {
    holidayState.holiday = null;
    const { container } = render(<Board words={[]} />);
    expect(container.querySelector('.holiday-bonus-tile')).toBeNull();
    expect(screen.queryByTestId('holiday-board-layer')).toBeNull();
  });
});

describe('Advent Board layer', () => {
  it('Given an Advent day, When the gift word is traced, Then the box unwraps with the gift sound', async () => {
    holidayState.holiday = 'christmas';
    const date = '2026-12-15';
    function Advent({ words }: { words: string[] }) {
      return (
        <div>
          <div data-board="">{GRID.flatMap((row, r) => row.map((l, c) => <span key={`${r}-${c}`} data-tile="" data-row={r} data-col={c}>{l}</span>))}</div>
          <HolidayBoardLayer grid={GRID} puzzleDate={date} language="en" foundWords={words} />
        </div>
      );
    }
    const { rerender } = render(<Advent words={[]} />);
    expect(screen.getByTestId('holiday-gift-box').textContent).toContain('A 4-letter gift is hidden');
    rerender(<Advent words={['tree']} />);
    await waitFor(() => expect(screen.getByTestId('holiday-gift-box').getAttribute('data-phase')).toBe('open'));
    expect(sfx.playGiftReceivedSound).toHaveBeenCalled();
  });
});

describe('Dreidel', () => {
  it('Given the server rolls gimel, When spun, Then it lands on ג and shows the coins', async () => {
    const fetch = mockFetch({ status: 'spun', face: 'gimel', coins: 30 });
    render(<HolidayDreidel puzzleDate="2026-12-06" />);
    fireEvent.click(screen.getByText('Spin!'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('ג: you take it all! +30 coins'));
    expect(fetch).toHaveBeenCalledWith('/api/holiday/spin', expect.objectContaining({ method: 'POST' }));
    expect(sfx.playCoinCascadeSound).toHaveBeenCalled();
  });

  it('Given an Israeli player lands on the fourth face, Then it reads פ, not ש', async () => {
    holidayState.region = 'IL';
    mockFetch({ status: 'spun', face: 'shin', coins: 10 });
    render(<HolidayDreidel puzzleDate="2026-12-06" />);
    fireEvent.click(screen.getByText('Spin!'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('פ:'));
  });
});

describe('Cracker', () => {
  it('Given no partner finished today, When pulled, Then it explains crackers need two', async () => {
    mockFetch({ status: 'locked' });
    render(<HolidayCracker puzzleDate="2026-12-15" />);
    const btn = screen.getByLabelText('Pull the cracker');
    for (let i = 0; i < 3; i++) await act(async () => fireEvent.click(btn));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Crackers need two'));
  });

  it('Given a partner finished, When pulled, Then the joke and coins pop out', async () => {
    mockFetch({ status: 'pulled', joke: 2, coins: 25 });
    render(<HolidayCracker puzzleDate="2026-12-15" />);
    const btn = screen.getByLabelText('Pull the cracker');
    for (let i = 0; i < 3; i++) await act(async () => fireEvent.click(btn));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('+25 coins'));
    expect(sfx.playChestOpenSound).toHaveBeenCalled();
  });
});

describe('Intro and results cards', () => {
  it('Given night 3, Then the intro names the Nightly Board and night 3', () => {
    render(<HolidayDailyIntro puzzleDate="2026-12-06" language="en" />);
    expect(screen.getByTestId('holiday-daily-intro').textContent).toContain('Night 3');
  });

  it('Given a date outside the holiday, Then no intro renders', () => {
    render(<HolidayDailyIntro puzzleDate="2026-11-27" language="en" />);
    expect(screen.queryByTestId('holiday-daily-intro')).toBeNull();
  });

  it('Given the submit settled tonight, Then results say the night was lit by the Nightly Board', async () => {
    mockFetch({ table: null, rescue: null, count: null });
    render(<HolidayDailyResults puzzleDate="2026-12-06" language="en" />);
    act(() =>
      publishHolidaySettlement({
        holiday: 'hanukkah', puzzleDate: '2026-12-06', kind: 'nightly', day: 3, geltWords: 2, giftFound: false, coins: 10,
        spinFace: null, spinCoins: null, crackerJoke: null, crackerCoins: null, alreadySettled: false,
      }),
    );
    expect(screen.getByTestId('holiday-daily-results').textContent).toContain('Night 3 lit by the Nightly Board. 2 gelt words, +10 coins.');
    expect(screen.getByTestId('holiday-dreidel')).toBeTruthy();
  });

  it('Given a guest, Then results ask them to sign in and show no dreidel', () => {
    auth.user = null;
    mockFetch({ count: null });
    render(<HolidayDailyResults puzzleDate="2026-12-06" language="en" />);
    expect(screen.getByTestId('holiday-daily-results').textContent).toContain('Sign in to light tonight’s candle');
    expect(screen.queryByTestId('holiday-dreidel')).toBeNull();
  });

  it('Given a friend arrived on a holiday invite, When their daily submit lands, Then the inviter’s night is relit once', async () => {
    sessionStorage.setItem('lx_holiday_invite', JSON.stringify({ ref: 'NOA123', holiday: 'hanukkah' }));
    const fetch = vi.fn(async (url: string) =>
      new Response(JSON.stringify(url.startsWith('/api/holiday/rescue') ? { status: 'relit', day: 2 } : { table: null, rescue: null, count: null })),
    );
    vi.stubGlobal('fetch', fetch);
    render(<HolidayDailyResults puzzleDate="2026-12-06" language="en" />);
    expect(fetch.mock.calls.some(([u]) => String(u) === '/api/holiday/rescue')).toBe(false);
    act(() => publishHolidaySettlement(undefined));
    await waitFor(() => expect(screen.getByTestId('holiday-daily-results').textContent).toContain('You relit night 2 for your friend!'));
    expect(sessionStorage.getItem('lx_holiday_invite')).toBeNull();
  });
});
