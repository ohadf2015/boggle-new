import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ value: { loading: false, isAuthenticated: true } as Record<string, unknown> }));
const publishRunRecord = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'he', t: (k: string) => k }) }));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: async () => 'fp1' }));
vi.mock('@/utils/dailyChallenge/dateUtils', () => ({ getDailyChallengeDate: () => '2026-11-11' }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (url: string) => fetchMock(url) }));
vi.mock('@/lib/records/runRecord', () => ({
  PUBLISHING_MODES: new Set(['quickPlay', 'blast', 'single', 'tower']),
  publishRunRecord: (a: unknown) => publishRunRecord(a),
}));
vi.mock('../PublicNamePrompt', () => ({ PublicNamePrompt: () => <div data-testid="slot-name" /> }));
vi.mock('@/components/progression/NewRecordBanner', () => ({ NewRecordBanner: () => <div data-testid="slot-record" /> }));
vi.mock('@/components/records/WorldRecordChip', () => ({ WorldRecordChip: ({ subMode }: { subMode?: string }) => <div data-testid="slot-world">{subMode}</div> }));
vi.mock('@/components/progression/NextUnlockTeaser', () => ({ NextUnlockTeaser: () => <div data-testid="slot-unlock" /> }));
vi.mock('@/components/rivals/RivalCard', () => ({ RivalCard: ({ rival }: { rival: { name: string } }) => <div data-testid="slot-rival">{rival.name}</div> }));

import { ResultsSocialSlot } from '../ResultsSocialSlot';

const fetchMock = vi.hoisted(() => vi.fn());


describe('ResultsSocialSlot', () => {
  beforeEach(() => {
    publishRunRecord.mockReset();
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ rival: { kind: 'h2h', name: 'Bea' } })));
    vi.stubGlobal('fetch', fetchMock);
    auth.value = { loading: false, isAuthenticated: true };
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Given a finished run, Then name prompt, record, world record, rival and unlock render in that order', async () => {
    const { container } = render(<ResultsSocialSlot mode="blast" score={120} previousBest={100} />);
    await waitFor(() => expect(screen.getByTestId('slot-rival').textContent).toBe('Bea'));
    const ids = Array.from(container.querySelectorAll('[data-testid^="slot-"]')).map((e) => e.getAttribute('data-testid'));
    expect(ids).toEqual(['slot-name', 'slot-record', 'slot-world', 'slot-rival', 'slot-unlock']);
  });

  it('Given a publishing mode, Then the slot publishes the run record with the pre-run best', () => {
    render(<ResultsSocialSlot mode="tower" score={50} previousBest={40} />);
    expect(publishRunRecord).toHaveBeenCalledWith({ mode: 'tower', value: 50, previous: 40 });
  });

  it('Given multiplayer, Then no record is published (the banner uses its ledger) and opponents go to the rival lookup', async () => {
    render(<ResultsSocialSlot mode="multiplayer" score={10} opponentUserIds={['a', 'b']} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(publishRunRecord).not.toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('mode=multiplayer');
    expect(url).toContain('opponents=a%2Cb');
    expect(url).toContain('lang=he');
  });

  it('Given auth still resolving, Then no lookup runs yet', () => {
    auth.value = { loading: true, isAuthenticated: false };
    render(<ResultsSocialSlot mode="daily" score={10} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given a guest on the daily, Then the fingerprint is sent', async () => {
    auth.value = { loading: false, isAuthenticated: false };
    render(<ResultsSocialSlot mode="daily" score={10} date="2026-11-11" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain('fp=fp1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('date=2026-11-11');
  });

  it('Given edu with a classroom rival from the screen, Then it renders without any network call', () => {
    render(<ResultsSocialSlot mode="edu" rival={{ kind: 'classroom', name: 'Ben' }} />);
    expect(screen.getByTestId('slot-rival').textContent).toBe('Ben');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('slot-world')).toBeNull();
  });

  it('Given the lookup fails, Then the rest of the slot still renders', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<ResultsSocialSlot mode="single" score={5} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('slot-rival')).toBeNull();
    expect(screen.getByTestId('slot-unlock')).toBeTruthy();
  });
});
