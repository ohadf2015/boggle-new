import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const capture = vi.fn();
const state: { records: unknown[]; status: string; userId: string | null; name: string | null; loading: boolean } = { records: [], status: 'ready', userId: null, name: null, loading: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, profile: state.userId ? { display_name: state.name } : null, loading: state.loading }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
const share = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/quick-play' }));
vi.mock('next/dynamic', () => ({
  default: () => (props: { isOpen: boolean; initialMode?: string }) =>
    props.isOpen ? <div data-testid="auth-modal" data-mode={props.initialMode} /> : null,
}));
vi.mock('@/lib/records/useWorldRecords', () => ({ useWorldRecords: () => ({ records: state.records, status: state.status, retry: vi.fn() }) }));

import { WorldRecordChip } from '../WorldRecordChip';

const qp = { recordKey: 'qp_classic', mode: 'quickPlay', labelKey: 'worldRecords.modes.qp_classic', unit: 'points', holderId: 'u2', holderName: 'Ari', score: 918 };
const tower = { ...qp, recordKey: 'tower', mode: 'tower', labelKey: 'worldRecords.modes.tower', unit: 'metres', score: 3093.46 };

describe('WorldRecordChip', () => {
  beforeEach(() => {
    capture.mockReset();
    state.records = [qp, tower];
    state.status = 'ready';
    state.userId = null;
    state.name = null;
    state.loading = false;
  });

  it('Given a score under the record, Then it names the holder and how much beats it', () => {
    render(<WorldRecordChip mode="quickPlay" subMode="classic" score={900} />);
    expect(screen.getByText('worldRecords.chip.holder {"name":"Ari","score":"918"}')).toBeTruthy();
    expect(screen.getByText('worldRecords.chip.gap {"gap":"19"}')).toBeTruthy();
    expect(capture).toHaveBeenCalledWith('world_record_viewed', { mode: 'quickPlay', record_key: 'qp_classic', state: 'chasing' });
  });

  it('Given a signed-in named player over the record, Then it shouts a new world record', () => {
    state.userId = 'u5';
    state.name = 'Noa';
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(screen.getByText('worldRecords.chip.newRecord')).toBeTruthy();
    expect(screen.queryByText(/worldRecords.chip.claim/)).toBeNull();
    expect(screen.queryByText(/worldRecords.chip.gap/)).toBeNull();
  });

  it('Given a signed-in named player over the record, Then Brag shares a world-record link', async () => {
    state.userId = 'u5';
    state.name = 'Noa';
    share.mockReset().mockResolvedValue('shared');
    Object.defineProperty(window, 'location', { value: { origin: 'https://lexiclash.live', pathname: '/en/quick-play' }, writable: true });
    render(<WorldRecordChip mode="tower" score={4000.7} />);
    fireEvent.click(screen.getByTestId('brag-button-world_record'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const { text, url } = share.mock.calls[0][0];
    expect(text).toContain('brag2.text.worldRecord');
    expect(text).toContain('worldRecords.metres');
    const q = new URL(url).searchParams;
    expect(q.get('kind')).toBe('worldRecord');
    expect(q.get('score')).toBe('4001');
    expect(q.get('mode')).toBe('tower');
    expect(q.get('me')).toBe('Noa');
  });

  it('Given a guest over the record, Then it tells them to sign in to claim it', () => {
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(screen.getByText('worldRecords.chip.claimSignIn')).toBeTruthy();
    expect(screen.queryByTestId('brag-button-world_record')).toBeNull();
  });

  it('Given a signed-in player with a generated name over the record, Then it asks for a real name', () => {
    state.userId = 'u5';
    state.name = 'Player_3fa2';
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(screen.getByText('worldRecords.chip.claimName')).toBeTruthy();
  });

  it('waits for sign-in to resolve before choosing what to say', () => {
    state.loading = true;
    const { container } = render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(container.innerHTML).toBe('');
  });

  it('Given I already hold it, Then it says so instead of a gap', () => {
    state.userId = 'u2';
    render(<WorldRecordChip mode="quickPlay" score={500} />);
    expect(screen.getByText('worldRecords.chip.youHold {"score":"918"}')).toBeTruthy();
    expect(screen.queryByText(/worldRecords.chip.gap/)).toBeNull();
  });

  it('shows tower records in whole metres', () => {
    render(<WorldRecordChip mode="tower" score={3000} />);
    expect(screen.getByText('worldRecords.chip.holder {"name":"Ari","score":"worldRecords.metres {\\"value\\":\\"3,093\\"}"}')).toBeTruthy();
  });

  it('renders nothing for classroom games, unknown games, or before records load', () => {
    const { container, rerender } = render(<WorldRecordChip mode="edu" score={10} />);
    expect(container.innerHTML).toBe('');
    rerender(<WorldRecordChip mode="blast" score={10} />);
    expect(container.innerHTML).toBe('');
    state.status = 'loading';
    rerender(<WorldRecordChip mode="quickPlay" score={10} />);
    expect(container.innerHTML).toBe('');
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given a new record, Then it celebrates on a dark card with a crown badge, announced politely', () => {
    state.userId = 'u5';
    state.name = 'Noa';
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    const chip = screen.getByTestId('world-record-chip');
    expect(chip).toHaveAttribute('data-state', 'new');
    expect(chip).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('world-record-crown-badge')).toBeTruthy();
  });

  it('Given a guest over the record, When they tap the claim action, Then sign-up opens right there and the tap is counted', () => {
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(screen.queryByTestId('auth-modal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'worldRecords.chip.claimSignIn' }));
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signup');
    expect(capture).toHaveBeenCalledWith('world_record_claim_tapped', { mode: 'quickPlay', record_key: 'qp_classic', state: 'claimSignIn' });
  });

  it('Given a generated name over the record, Then the claim action leads to the profile where the name is set', () => {
    state.userId = 'u5';
    state.name = 'Player_3fa2';
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    const link = screen.getByRole('link', { name: 'worldRecords.chip.claimName' });
    expect(link).toHaveAttribute('href', '/en/profile');
    fireEvent.click(link);
    expect(capture).toHaveBeenCalledWith('world_record_claim_tapped', { mode: 'quickPlay', record_key: 'qp_classic', state: 'claimName' });
  });
});

