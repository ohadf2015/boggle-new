import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MpStandingRowItem } from '../MpStandingRow';
import { MpGuestAddPromptProvider } from '../MpGuestAddChip';
import type { MpStandingRow } from '../mpStandings';

const h = vi.hoisted(() => ({
  ctx: { isAuthenticated: false } as { isAuthenticated: boolean } | null,
  tier: 'unknown' as string,
  capture: vi.fn(),
}));
vi.mock('@/components/friends/FriendStatusContext', () => ({ useFriendStatus: () => h.ctx }));
vi.mock('@/hooks/useSocialCapabilities', () => ({ useSocialCapabilities: () => ({ tier: h.tier }) }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => <span data-testid="friend-quick-action" /> }));
vi.mock('@/components/records/RecordHolderCrown', () => ({ RecordHolderCrown: () => null }));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: h.capture } }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (p: { isOpen: boolean }) => (p.isOpen ? <div data-testid="auth-modal" /> : null),
}));

const t = (k: string) => k;
const row = (over: Partial<MpStandingRow> = {}): MpStandingRow =>
  ({ username: 'pal', userId: 'u-pal', score: 50, rank: 2, isMe: false, isBot: false, seriesTotal: null, seriesDelta: 0, ...over }) as MpStandingRow;

const renderRow = (r: MpStandingRow, allowed = true) =>
  render(
    <MpGuestAddPromptProvider value={allowed}>
      <ul><MpStandingRowItem row={r} shown layout="list" t={t} /></ul>
    </MpGuestAddPromptProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.ctx = { isAuthenticated: false };
  h.tier = 'unknown';
});

describe('MpStandingRow guest add prompt', () => {
  it('Given a guest viewer and a signed-in player row, Then a Sign in to add chip opens the auth modal', () => {
    renderRow(row());
    expect(screen.queryByTestId('friend-quick-action')).toBeNull();
    fireEvent.click(screen.getByTestId('mp-guest-add'));
    expect(screen.getByTestId('auth-modal')).toBeTruthy();
    expect(h.capture).toHaveBeenCalledWith('guest_add_friend_prompt_tapped', { surface: 'mp_results' });
  });

  it('Given a signed-in viewer, Then the normal friend action shows, not the chip', () => {
    h.ctx = { isAuthenticated: true };
    renderRow(row());
    expect(screen.getByTestId('friend-quick-action')).toBeTruthy();
    expect(screen.queryByTestId('mp-guest-add')).toBeNull();
  });

  it.each([
    ['a guest row (no user id)', () => renderRow(row({ userId: undefined }))],
    ['a bot row', () => renderRow(row({ isBot: true }))],
    ['a classroom room (prompt not allowed)', () => renderRow(row(), false)],
    ['a guest who declared a child age', () => { h.tier = 'child'; renderRow(row()); }],
    ['no friend provider', () => { h.ctx = null; renderRow(row()); }],
  ])('Given %s, Then no chip', (_label, run) => {
    run();
    expect(screen.queryByTestId('mp-guest-add')).toBeNull();
  });

  it('Given no provider for the prompt, Then it defaults to off', () => {
    render(<ul><MpStandingRowItem row={row()} shown layout="list" t={t} /></ul>);
    expect(screen.queryByTestId('mp-guest-add')).toBeNull();
  });
});
