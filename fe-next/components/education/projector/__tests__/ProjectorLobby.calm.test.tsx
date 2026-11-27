import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string) => key;
const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string; isBot?: boolean }[],
  t,
  onStartGame: vi.fn(),
  onStartPracticeRound: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};
const CLASS_LIST = Array.from({ length: 8 }, (_, i) => ({ username: `Student ${i + 1}` }));

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
// The ambient backdrop is decoration behind the panels, not a control or card.
const withFill = (root: HTMLElement, fill: RegExp) => [...root.querySelectorAll('*')].filter((el) => !el.closest('[data-ambient]') && tokens(el).some((c) => fill.test(c)));
const LIME_FILL = /^bg-neo-lime$/;
const LOUD_FILL = /^bg-neo-(cyan|pink|purple|yellow|orange)(\/\d+)?$/;

describe('ProjectorLobby: calm wall, one lime primary', () => {
  it.each([
    ['an empty room in a mode bots can play', { classroomGameMode: 'classic' as const }],
    ['an empty room in a mode bots cannot play', { classroomGameMode: 'wordcraft' as const }],
    ['a room with students', { students: CLASS_LIST }],
  ])('Given %s, Then exactly one control is filled lime', (_, extra) => {
    const { container } = render(<ProjectorLobby {...props} {...extra} />);
    expect(withFill(container, LIME_FILL)).toHaveLength(1);
  });

  // Sky wall (approved mockup): the loud bits are the class's purple chip and the pink join address; the
  // ready bar fills pink once phones are in. Student chips and cards stay white.
  it('Given students, Then their name chips are neutral, not a rainbow of fills, and only the class chip, address and ready bar are loud', () => {
    const { container } = render(<ProjectorLobby {...props} students={CLASS_LIST} />);
    const loud = withFill(container, LOUD_FILL);
    expect(loud.map((el) => el.getAttribute('data-testid') || el.tagName)).toEqual(['projector-session-chip', 'projector-join-address', 'DIV']);
    expect(loud[2].closest('[data-testid="projector-ready-count"]')).not.toBeNull();
    screen.getAllByTestId('projector-student').forEach((chip) => expect(tokens(chip).some((c) => LOUD_FILL.test(c))).toBe(false));
  });

  it('Given an empty room, Then no badge, chip or card is loud except the class chip and the join address', () => {
    const { container } = render(<ProjectorLobby {...props} />);
    expect(withFill(container, LOUD_FILL).map((el) => el.getAttribute('data-testid') || el.tagName)).toEqual(['projector-session-chip', 'projector-join-address']);
  });

  it('paints no art behind the text: the wall is solid navy and the panels are opaque', () => {
    render(<ProjectorLobby {...props} />);
    expect(screen.queryByTestId('projector-arena-art')).toBeNull();
    for (const id of ['projector-join-panel', 'projector-roster', 'projector-mode']) {
      expect(tokens(screen.getByTestId(id)).filter((c) => /^bg-neo-navy[\w-]*\/\d+$/.test(c))).toEqual([]);
    }
  });

  it('Then the calm teacher backdrop sits behind the opaque panels, decorative only', () => {
    render(<ProjectorLobby {...props} />);
    const lobby = screen.getByTestId('projector-lobby');
    const backdrop = lobby.querySelector(':scope > [data-ambient]');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(tokens(lobby)).toContain('isolate');
  });

  it('shouts nothing: no upper-case labels anywhere on the wall', () => {
    const { container } = render(<ProjectorLobby {...props} />);
    const shouting = [...container.querySelectorAll('*')].filter((el) => {
      const own = tokens(el);
      return own.includes('uppercase') && !own.includes('normal-case');
    });
    expect(shouting.map((el) => el.getAttribute('data-testid') || el.textContent?.slice(0, 20))).toEqual([]);
  });

  it('Given nobody joined, Then Start tells the teacher when it opens', () => {
    render(<ProjectorLobby {...props} />);
    expect(screen.getByTestId('projector-start')).toHaveTextContent('education.projectorLobby.startWhenReady');
  });

  it('Given nobody joined, Then the waiting mascot stays small and still', () => {
    render(<ProjectorLobby {...props} />);
    const mascot = screen.getByTestId('projector-roster-empty').querySelector('img') as HTMLImageElement;
    expect(mascot.className).not.toMatch(/animate-/);
  });

  it('Given nobody joined, Then the phone test sits in the waiting panel, not under Start', () => {
    render(<ProjectorLobby {...props} />);
    expect(within(screen.getByTestId('projector-roster-empty')).getByTestId('edu-phone-test')).toBeInTheDocument();
    expect(within(screen.getByTestId('projector-start-bar')).queryByTestId('edu-phone-test')).toBeNull();
  });

  it('Given the lobby runs on a phone-width frame, Then the phone test steps aside, since a phone cannot scan its own screen', () => {
    render(<ProjectorLobby {...props} />);
    expect((screen.getByTestId('edu-phone-test').parentElement as HTMLElement).className).toContain('@max-3xl:hidden');
  });
});
