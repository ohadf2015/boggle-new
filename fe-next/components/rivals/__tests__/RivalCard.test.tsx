import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const capture = vi.fn();
const ping = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/progression/TitleBadge', () => ({ TitleBadge: ({ title }: { title?: string | null }) => (title ? <span>{title}</span> : null) }));
vi.mock('../RivalPingButton', () => ({ RivalPingButton: (p: unknown) => { ping(p); return <button>ping</button>; } }));

import { RivalCard } from '../RivalCard';

describe('RivalCard', () => {
  beforeEach(() => { capture.mockReset(); ping.mockReset(); });

  it('Given a rival ahead of me, Then it says how much to beat them by, links their profile and offers a ping', () => {
    render(<RivalCard mode="daily" rival={{ kind: 'daily', userId: 'r1', name: 'Rina', title: 'Champion', theirScore: 300, myScore: 280, gap: 20 }} />);
    expect(screen.getByText('rivals.beatBy {"name":"Rina","gap":20}')).toBeTruthy();
    expect(screen.getByText('Champion')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/en/player/r1');
    expect(ping).toHaveBeenCalledWith({ targetUserId: 'r1', targetName: 'Rina', context: 'daily' });
    expect(capture).toHaveBeenCalledWith('rival_card_viewed', { mode: 'daily', kind: 'daily', why: null });
  });

  it('Given I beat them, Then it celebrates with the record strip', () => {
    render(<RivalCard mode="multiplayer" rival={{ kind: 'h2h', userId: 'b', name: 'Bea', gap: -5, record: { wins: 3, losses: 2, draws: 1 } }} />);
    expect(screen.getByText('rivals.youBeat {"name":"Bea"}')).toBeTruthy();
    expect(screen.getByTestId('rival-record').textContent).toContain('3');
  });

  it('Given they pinged me, Then the chip shows', () => {
    render(<RivalCard mode="multiplayer" rival={{ kind: 'h2h', userId: 'b', name: 'Bea', pingedMeAt: '2026-11-11T10:00:00Z' }} />);
    expect(screen.getByText('rivals.pingedYou')).toBeTruthy();
  });

  it('Given an edu classroom rival or a guest rival, Then there is no ping and no link', () => {
    render(<RivalCard mode="edu" rival={{ kind: 'classroom', name: 'Ben', gap: 10, theirScore: 40, myScore: 30 }} />);
    expect(ping).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('Given my own previous best, Then it reads as a chase of my best', () => {
    render(<RivalCard mode="tower" rival={{ kind: 'self', name: '', theirScore: 55, myScore: 40, gap: 15 }} />);
    expect(screen.getByText('rivals.selfChase {"gap":15}')).toBeTruthy();
  });
});

describe('RivalCard rematch', () => {
  it('Given a rematch handler, Then the card offers a rematch button that calls it', () => {
    const onRematch = vi.fn();
    render(<RivalCard mode="multiplayer" onRematch={onRematch} rival={{ kind: 'h2h', userId: 'u-maya', name: 'Maya', record: { wins: 2, losses: 4, draws: 0 } }} />);
    screen.getByTestId('rival-rematch').click();
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('Given no rematch handler, Then there is no rematch button', () => {
    render(<RivalCard mode="daily" rival={{ kind: 'daily', userId: 'r1', name: 'Rina', gap: 5 }} />);
    expect(screen.queryByTestId('rival-rematch')).toBeNull();
  });

  it('Given a reason, Then a chip says why they are your rival and analytics carries it', () => {
    render(<RivalCard mode="blast" rival={{ kind: 'related', userId: 'b', name: 'Bea', why: { kind: 'playedTogether', count: 4 } }} />);
    expect(screen.getByTestId('rival-why').textContent).toBe('rivals.why.playedTogether {"count":4}');
    expect(capture).toHaveBeenCalledWith('rival_card_viewed', { mode: 'blast', kind: 'related', why: 'playedTogether' });
  });

  it('Given a shared country, Then the chip names the country in the viewer\'s language', () => {
    render(<RivalCard mode="daily" rival={{ kind: 'daily', userId: 'c', name: 'Cleo', why: { kind: 'sameCountry', country: 'IL' } }} />);
    expect(screen.getByTestId('rival-why').textContent).toBe('rivals.why.sameCountry {"country":"Israel"}');
  });

  it('Given a shared country code the browser cannot name, Then no chip shows', () => {
    render(<RivalCard mode="daily" rival={{ kind: 'daily', userId: 'c', name: 'Cleo', why: { kind: 'sameCountry' } }} />);
    expect(screen.queryByTestId('rival-why')).toBeNull();
  });
});
