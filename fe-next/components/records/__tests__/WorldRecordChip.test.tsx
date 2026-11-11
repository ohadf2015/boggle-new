import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const capture = vi.fn();
const state: { records: unknown[]; status: string; userId: string | null; name: string | null; loading: boolean } = { records: [], status: 'ready', userId: null, name: null, loading: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.userId ? { id: state.userId } : null, profile: state.userId ? { display_name: state.name } : null, loading: state.loading }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
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

  it('Given a guest over the record, Then it tells them to sign in to claim it', () => {
    render(<WorldRecordChip mode="quickPlay" score={1000} />);
    expect(screen.getByText('worldRecords.chip.claimSignIn')).toBeTruthy();
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
});
