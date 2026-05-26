import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BlastV2PageClient } from '../BlastV2PageClient';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { GUEST_PROGRESS_KEY, RESUME_HINT_KEY, readGuestProgress } from '@/lib/blast/v2/guestProgress';

const mkLevel = (n: number): BlastLevel => ({
  id: `l${n}`, levelNumber: n, theme: 'fruits', locale: 'en',
  words: ['FIG'], columns: [{ index: 0, tiles: ['F', 'I', 'G'] }],
  resolvableOrder: ['FIG'], tileFlags: {}, difficulty: n,
});
const level1 = mkLevel(1);

vi.mock('@/components/blast/v2/BlastGame', () => ({
  BlastGame: ({ level, onAdvance, unlocksSeen }: { level: BlastLevel; onAdvance: () => void; unlocksSeen?: Record<string, boolean> }) => (
    <div>
      <span data-testid="level-number">{level.levelNumber}</span>
      <span data-testid="unlocks">{JSON.stringify(unlocksSeen ?? {})}</span>
      <button data-testid="advance" onClick={onAdvance}>advance</button>
    </div>
  ),
}));

type Resp = { ok: boolean; status: number; json: () => Promise<unknown> };

/** Routes the mount-time progress GET and the level GETs independently. */
function routeFetch(routes: {
  progress?: () => Resp;
  level?: (levelNum: number) => Resp;
}) {
  return vi.fn((url: string) => {
    if (url.includes('/api/blast/progress')) {
      return Promise.resolve((routes.progress ?? (() => ({ ok: false, status: 401, json: async () => ({}) })))());
    }
    if (url.includes('/api/blast/level')) {
      const n = Number(new URLSearchParams(url.split('?')[1]).get('level'));
      return Promise.resolve((routes.level ?? ((lv: number) => ({ ok: true, status: 200, json: async () => mkLevel(lv) })))(n));
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

const renderClient = () =>
  render(
    <LanguageProvider initialLanguage="en">
      <BlastV2PageClient level={level1} />
    </LanguageProvider>,
  );

describe('BlastV2PageClient — resume + boot gate (Plan 3b)', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = routeFetch({}) as unknown as typeof fetch;
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('no resume hint: paints level 1 immediately without a boot loader (instant new-player paint)', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 1, maxLevelCleared: 0, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }) }),
    }) as unknown as typeof fetch;

    renderClient();

    // Synchronously, before any progress GET resolves: board is up, no loader.
    expect(screen.getByTestId('level-number').textContent).toBe('1');
    expect(screen.queryByTestId('blast-boot-loader')).toBeNull();
  });

  it('resume hint > 1: holds the boot loader until the resume resolves (no level-1 flash)', async () => {
    localStorage.setItem(RESUME_HINT_KEY, '5');
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 5, maxLevelCleared: 4, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }) }),
      level: (n) => ({ ok: true, status: 200, json: async () => mkLevel(n) }),
    }) as unknown as typeof fetch;

    renderClient();

    // First paint is the loader, never level 1.
    expect(screen.getByTestId('blast-boot-loader')).toBeTruthy();
    expect(screen.queryByTestId('level-number')).toBeNull();

    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('5'));
    expect(screen.queryByTestId('blast-boot-loader')).toBeNull();
  });

  it('new player (currentLevel=1): renders level 1, never fetches a resume level', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 1, maxLevelCleared: 0, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }) }),
    }) as unknown as typeof fetch;

    renderClient();

    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('1'));
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/blast/level'))).toBe(false);
  });

  it('threads saved unlocks_seen to BlastGame so resumers skip seen tutorials', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 1, maxLevelCleared: 0, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: { ftue_completed: true }, locale: 'en' }) }),
    }) as unknown as typeof fetch;

    renderClient();

    // With instant paint the board shows before the GET resolves; the unlocks
    // thread in once progress loads — wait for it rather than assert synchronously.
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('unlocks').textContent || '{}')).toMatchObject({ ftue_completed: true }),
    );
  });

  it('resumes at the saved currentLevel (>1) by fetching that level', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 5, maxLevelCleared: 4, coins: 200, chestNumber: 2, chestProgress: 0.2, unlocksSeen: {}, locale: 'en' }) }),
      level: (n) => ({ ok: true, status: 200, json: async () => mkLevel(n) }),
    }) as unknown as typeof fetch;

    renderClient();

    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('5'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/blast/level?level=5&locale=en'));
  });

  it('falls back to level 1 when the resume level fetch fails', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 9, maxLevelCleared: 8, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }) }),
      level: () => ({ ok: false, status: 500, json: async () => ({}) }),
    }) as unknown as typeof fetch;

    renderClient();

    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('1'));
  });

  it('advances to the next level when onAdvance fires', async () => {
    // guest (progress 401) → currentLevel 1 → renders level 1 → advance to 2
    global.fetch = routeFetch({
      level: (n) => ({ ok: true, status: 200, json: async () => mkLevel(n) }),
    }) as unknown as typeof fetch;

    renderClient();
    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('1'));

    screen.getByTestId('advance').click();

    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('2'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/blast/level?level=2&locale=en'));
  });

  it('guest advance persists the new level position to localStorage', async () => {
    global.fetch = routeFetch({
      level: (n) => ({ ok: true, status: 200, json: async () => mkLevel(n) }),
    }) as unknown as typeof fetch;

    renderClient();
    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('1'));

    screen.getByTestId('advance').click();
    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('2'));

    await waitFor(() => expect(readGuestProgress()).toEqual({ currentLevel: 2, locale: 'en' }));
    expect(localStorage.getItem(GUEST_PROGRESS_KEY)).not.toBeNull();
  });

  it('authed advance does NOT write guest localStorage (server-persisted)', async () => {
    global.fetch = routeFetch({
      progress: () => ({ ok: true, status: 200, json: async () => ({ currentLevel: 1, maxLevelCleared: 0, coins: 0, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }) }),
      level: (n) => ({ ok: true, status: 200, json: async () => mkLevel(n) }),
    }) as unknown as typeof fetch;

    renderClient();
    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('1'));

    screen.getByTestId('advance').click();
    await waitFor(() => expect(screen.getByTestId('level-number').textContent).toBe('2'));

    expect(localStorage.getItem(GUEST_PROGRESS_KEY)).toBeNull();
  });
});
