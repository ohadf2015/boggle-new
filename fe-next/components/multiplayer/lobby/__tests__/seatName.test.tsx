/**
 * Seat names in the lobby's ~78px phone column: a long username used to break
 * at ANY character (overflow-wrap:anywhere) → "LobJoinTp4s" / "0p", orphaning a
 * mid-token scrap (seen at 390px, /he/). Names now wrap only at natural seams —
 * spaces, `_ - .`, camelCase humps, letter→digit — balanced over two lines.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { seatNameSegments, SeatNameText } from '../SeatName';

describe('seatNameSegments', () => {
  it('splits a camelCase + digits username at its humps, never mid-hump', () => {
    expect(seatNameSegments('LobJoinTp4s0p')).toEqual(['Lob', 'Join', 'Tp', '4s', '0p']);
    expect(seatNameSegments('LobJoin03xyz')).toEqual(['Lob', 'Join', '03xyz']);
  });

  it('splits after _ - . separators, keeping the separator on the first line', () => {
    expect(seatNameSegments('cool_gamer')).toEqual(['cool_', 'gamer']);
    expect(seatNameSegments('dana-k.99')).toEqual(['dana-', 'k.', '99']);
  });

  it('leaves Hebrew words whole (spaces are the only seam the browser needs)', () => {
    expect(seatNameSegments('אוהד פישר')).toEqual(['אוהד פישר']);
    expect(seatNameSegments('מיכאל')).toEqual(['מיכאל']);
  });

  it('a Hebrew name followed by digits may wrap before the digits', () => {
    expect(seatNameSegments('שחקן2024')).toEqual(['שחקן', '2024']);
  });

  it('keeps a short or single-segment name intact', () => {
    expect(seatNameSegments('Bo')).toEqual(['Bo']);
    expect(seatNameSegments('')).toEqual(['']);
  });
});

describe('SeatNameText', () => {
  it('renders the full name as text with <wbr> only at the seams', () => {
    const { container } = render(<span data-testid="n"><SeatNameText name="LobJoinTp4s0p" /></span>);
    const host = container.querySelector('[data-testid="n"]')!;
    expect(host.textContent).toBe('LobJoinTp4s0p');
    expect(host.querySelectorAll('wbr')).toHaveLength(4);
  });
});
