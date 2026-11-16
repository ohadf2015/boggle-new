import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SoloBragPrompt } from '../SoloBragPrompt';

const h = vi.hoisted(() => ({
  share: vi.fn(async () => 'shared' as const),
  capture: vi.fn(),
}));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: h.share }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: h.capture } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}|${JSON.stringify(p)}` : k);

const results = {
  playerScore: 240,
  playerWords: ['cat', 'planet', 'zebra'],
  isNewHighScore: true,
  gameSessionId: 'abc123',
} as never;

type ShareArg = { text: string; url: string };

beforeEach(() => vi.clearAllMocks());

describe('SoloBragPrompt', () => {
  it('Given closed, Then renders nothing', () => {
    const { container } = render(<SoloBragPrompt open={false} onClose={vi.fn()} results={results} isWinner={false} t={t} />);
    expect(container.innerHTML).toBe('');
  });

  it('Given a new record, When Brag is tapped, Then it shares a solo brag link, never a dead ?room=sp_ link', async () => {
    const onClose = vi.fn();
    render(<SoloBragPrompt open onClose={onClose} results={results} isWinner={false} t={t} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('solo-brag-share'));
    await waitFor(() => expect(h.share).toHaveBeenCalledTimes(1));
    const { url, text } = (h.share.mock.calls[0] as unknown as [ShareArg])[0];
    expect(url).toContain('/en/brag/');
    expect(url).toContain('score=240');
    expect(url).toContain('mode=singleplayer');
    expect(url).toContain('best=planet');
    expect(url).not.toContain('room=');
    expect(url).not.toContain('sp_');
    expect(text).toBe('brag2.solo.shareTextRecord|{"score":240}');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(h.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'solo_results', kind: 'solo_record', result: 'shared' });
  });

  it('Given a cancelled share sheet, Then the prompt stays open', async () => {
    h.share.mockResolvedValueOnce('cancelled' as never);
    const onClose = vi.fn();
    render(<SoloBragPrompt open onClose={onClose} results={{ ...(results as object), isNewHighScore: false } as never} isWinner t={t} />);
    fireEvent.click(screen.getByTestId('solo-brag-share'));
    await waitFor(() => expect(h.capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'solo_results', kind: 'solo_win', result: 'cancelled' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Given Not now, Then it closes without sharing', () => {
    const onClose = vi.fn();
    render(<SoloBragPrompt open onClose={onClose} results={results} isWinner t={t} />);
    fireEvent.click(screen.getByText('brag2.solo.notNow'));
    expect(onClose).toHaveBeenCalled();
    expect(h.share).not.toHaveBeenCalled();
  });
});
