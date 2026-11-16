import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MpBragStrip, useMpBrag } from '../MpBragStrip';

const h = vi.hoisted(() => ({
  share: vi.fn(async () => 'copied' as const),
  capture: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: h.share }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: h.capture } }));
vi.mock('react-hot-toast', () => ({ default: { success: h.toast, error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}|${JSON.stringify(p)}` : k);

const base = {
  visible: true,
  gameCode: 'ABCD',
  gameMode: 'classic',
  language: 'en',
  isWinner: true,
  rank: 1,
  playerCount: 2,
  score: 100,
  wordsFound: 5,
  longestWord: 'QUARTZ',
  current: { name: 'me', score: 100 },
  opponent: { name: 'you', score: 80 },
  modeLabel: 'CLASSIC',
  t,
};

type ShareArg = { text: string; url: string };
const lastShare = () => (h.share.mock.calls.at(-1) as unknown as [ShareArg])[0];

beforeEach(() => vi.clearAllMocks());

describe('MpBragStrip share', () => {
  it('Given a win, When Brag is tapped, Then the native share gets the brag link with both scores and a win line', async () => {
    const onShareStart = vi.fn();
    render(<MpBragStrip {...base} onShareStart={onShareStart} />);
    fireEvent.click(screen.getByTestId('mp-brag-strip-copy'));
    await waitFor(() => expect(h.share).toHaveBeenCalledTimes(1));
    const { url, text } = lastShare();
    expect(url).toContain('/en/brag/ABCD?');
    expect(url).toContain('score=100');
    expect(url).toContain('rival=80');
    expect(url).toContain('best=QUARTZ');
    expect(url).not.toContain('?room=');
    expect(text).toBe('brag2.mp.winText|{"score":100,"rival":80}');
    expect(onShareStart).toHaveBeenCalledTimes(1);
  });

  it('Given a win, Then the button is the celebrating Brag label', () => {
    render(<MpBragStrip {...base} />);
    expect(screen.getByTestId('mp-brag-strip-copy').textContent).toContain('brag2.mp.bragButton');
  });

  it('Given the share fell back to copy, Then a toast confirms and the tap is tracked with its result', async () => {
    render(<MpBragStrip {...base} />);
    fireEvent.click(screen.getByTestId('mp-brag-strip-copy'));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('brag.copied', expect.anything()));
    expect(h.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'mp_brag_strip', kind: 'mp_win', result: 'copied' });
  });

  it('Given a loss, Then the share keeps the versus line and is tracked as mp_result', async () => {
    h.share.mockResolvedValueOnce('shared' as never);
    render(<MpBragStrip {...base} isWinner={false} rank={2} score={60} current={{ name: 'me', score: 60 }} opponent={{ name: 'you', score: 80 }} />);
    fireEvent.click(screen.getByTestId('mp-brag-strip-copy'));
    await waitFor(() => expect(h.capture).toHaveBeenCalled());
    expect(lastShare().text.startsWith('brag.shareTextVs')).toBe(true);
    expect(h.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'mp_brag_strip', kind: 'mp_result', result: 'shared' });
    expect(h.toast).not.toHaveBeenCalled();
  });
});

describe('useMpBrag', () => {
  it('Given the footer Share, Then it shares the same brag link, not a join link', async () => {
    const { result } = renderHook(() => useMpBrag(base, t));
    await act(async () => {
      await result.current.share('mp_results_footer');
    });
    expect(lastShare().url).toContain('/brag/ABCD?');
    expect(h.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'mp_results_footer', kind: 'mp_win', result: 'copied' });
  });
});
