import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpRosterStrip } from '../MpRosterStrip';
import type { MpRosterPlayer } from '@/lib/multiplayer/roster';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

const p = (id: string, score: number, rank: number, extra: Partial<MpRosterPlayer> = {}): MpRosterPlayer => ({
  id, name: id, score, rank, isHost: false, isBot: false, conn: 'ok', ...extra,
});

const players = [p('Ana', 30, 1, { isHost: true }), p('Me', 20, 2), p('Bot', 10, 3, { isBot: true }), p('Cy', 0, 4, { conn: 'away' })];

describe('MpRosterStrip', () => {
  it('row layout: one seat per player with live scores, me marked', () => {
    render(<MpRosterStrip players={players} meId="Me" layout="row" showScores />);
    const seats = screen.getAllByTestId('mp-roster-seat');
    expect(seats).toHaveLength(4);
    const me = seats.find((s) => s.getAttribute('data-me') === 'true');
    expect(me?.textContent).toContain('20');
    expect(screen.getByTestId('mp-roster-strip').getAttribute('data-layout')).toBe('row');
  });

  it('caps at max and shows a +N overflow chip', () => {
    render(<MpRosterStrip players={players} meId="Me" layout="row" max={2} />);
    expect(screen.getAllByTestId('mp-roster-seat')).toHaveLength(2);
    expect(screen.getByTestId('mp-roster-overflow').textContent).toBe('+2');
  });

  it('always keeps me visible when capped, even if I rank below the cap', () => {
    render(<MpRosterStrip players={players} meId="Cy" layout="row" max={2} />);
    const ids = screen.getAllByTestId('mp-roster-seat').map((s) => s.getAttribute('data-player'));
    expect(ids).toContain('Cy');
    expect(ids).toHaveLength(2);
  });

  it('marks the host (crown) and bots (badge) and away players', () => {
    render(<MpRosterStrip players={players} meId="Me" layout="grid" />);
    expect(screen.getByTestId('mp-roster-crown')).toBeTruthy();
    expect(screen.getByTestId('mp-roster-bot')).toBeTruthy();
    const cy = screen.getAllByTestId('mp-roster-seat').find((s) => s.getAttribute('data-player') === 'Cy');
    expect(cy?.getAttribute('data-conn')).toBe('away');
  });

  it('grid layout renders empty seats up to the seat count and exposes seat actions', () => {
    const onSeatAction = vi.fn();
    render(<MpRosterStrip players={players.slice(0, 2)} meId="Me" layout="grid" seats={8} onSeatAction={onSeatAction} />);
    const empties = screen.getAllByTestId('mp-roster-empty');
    expect(empties).toHaveLength(6);
    fireEvent.click(empties[0]);
    expect(onSeatAction).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getAllByTestId('mp-roster-seat')[0]);
    expect(onSeatAction).toHaveBeenCalledWith('Ana');
  });

  it('marks ready players', () => {
    render(<MpRosterStrip players={[p('Me', 0, 1, { isReady: true })]} meId="Me" layout="grid" />);
    expect(screen.getByTestId('mp-roster-ready')).toBeTruthy();
  });
});
