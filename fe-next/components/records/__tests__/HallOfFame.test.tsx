import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const capture = vi.fn();
const retry = vi.fn();
const state: { records: unknown[]; status: string } = { records: [], status: 'ready' };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/lib/records/useWorldRecords', () => ({ useWorldRecords: () => ({ ...state, retry }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/progression/TitleBadge', () => ({ TitleBadge: ({ title }: { title?: string | null }) => (title ? <span>{title}</span> : null) }));

import { HallOfFame } from '../HallOfFame';

const rec = (over: Record<string, unknown>) => ({
  recordKey: 'mp_classic', mode: 'multiplayer', labelKey: 'worldRecords.modes.mp_classic', unit: 'points',
  holderId: 'u1', holderName: 'Maya', score: 1636, setAt: '2026-08-11T10:00:00Z', avatarConfig: null, title: 'wordsmith', ...over,
});

describe('HallOfFame', () => {
  beforeEach(() => {
    capture.mockReset();
    retry.mockReset();
    state.status = 'ready';
    state.records = [rec({}), rec({ recordKey: 'tower', mode: 'tower', labelKey: 'worldRecords.modes.tower', unit: 'metres', holderId: 'u2', holderName: 'Ari', score: 3093.4, title: null })];
  });

  it('shows every game with its holder, title, score and since when', () => {
    render(<HallOfFame />);
    expect(screen.getByText('worldRecords.modes.mp_classic')).toBeTruthy();
    expect(screen.getByText('Maya')).toBeTruthy();
    expect(screen.getByText('wordsmith')).toBeTruthy();
    expect(screen.getByText('1,636')).toBeTruthy();
    expect(screen.getByText('worldRecords.metres {"value":"3,093"}')).toBeTruthy();
    expect(screen.getAllByText(/worldRecords.hallOfFame.since/)).toHaveLength(2);
    expect(screen.getByText('Maya').closest('a')?.getAttribute('href')).toBe('/en/player/u1');
    expect(capture).toHaveBeenCalledWith('world_record_viewed', { mode: 'hall_of_fame', count: 2 });
  });

  it('marks the viewer\'s own records', () => {
    render(<HallOfFame viewerId="u2" />);
    expect(screen.getByText('worldRecords.hallOfFame.yours')).toBeTruthy();
  });

  it('shows an error with a retry instead of an empty hall', () => {
    state.status = 'error';
    state.records = [];
    render(<HallOfFame />);
    fireEvent.click(screen.getByRole('button', { name: 'worldRecords.hallOfFame.retry' }));
    expect(retry).toHaveBeenCalled();
    expect(screen.queryByText('worldRecords.hallOfFame.empty')).toBeNull();
  });

  it('says the records are up for grabs when none exist yet', () => {
    state.records = [];
    render(<HallOfFame />);
    expect(screen.getByText('worldRecords.hallOfFame.empty')).toBeTruthy();
  });
});
