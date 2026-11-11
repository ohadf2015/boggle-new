import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => ({ studyWordCount: 2 }) }));
vi.mock('@/hooks/useProjectorStudyCards', () => ({
  useProjectorStudyCards: () => [{ word: 'storm', definition: 'wind and rain' }, { word: 'cloud' }],
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

import ProjectorLobby from '../ProjectorLobby';
import { HERO_CODE_TEXT_COMPACT, SHORT_WALL } from '../projectorLobbyModel';

const t = (key: string) => key;
const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [{ username: 'Ada' }, { username: 'Ben' }],
  readyUsernames: ['Ada', 'Ben'],
  t,
  onStartGame: vi.fn(),
  onExitRoom: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);
const chunky = (el: Element) => tokens(el).includes('border-[3px]') && tokens(el).some((c) => /^shadow-hard(-\w+)?$/.test(c));

describe('ProjectorLobby: neo-brutalist wall', () => {
  it.each(['projector-join-panel', 'projector-roster', 'projector-mode', 'projector-words', 'projector-exit', 'projector-copy', 'projector-lobby-lock'])(
    '%s has a 3px edge and a hard shadow',
    (id) => {
      render(<ProjectorLobby {...props} />);
      expect(chunky(screen.getByTestId(id))).toBe(true);
    }
  );

  it('the session facts are chunky stickers', () => {
    render(<ProjectorLobby {...props} />);
    const chips = screen.getAllByTestId('projector-session-chip');
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => expect(chunky(chip)).toBe(true));
  });

  it('the join code leads with a cream sticker naming it', () => {
    render(<ProjectorLobby {...props} />);
    const sticker = screen.getByTestId('projector-code-sticker');
    expect(sticker).toHaveTextContent('tvBroadcast.gameCode');
    expect(tokens(sticker)).toEqual(expect.arrayContaining(['bg-neo-cream', 'border-neo-black']));
  });

  it('each lesson word is its own chunky card', () => {
    render(<ProjectorLobby {...props} />);
    screen.getAllByTestId('projector-word').forEach((card) => expect(chunky(card)).toBe(true));
  });

  it('Given lesson words on the wall, Then the join hero goes compact (code beside QR) so Start stays on screen', () => {
    render(<ProjectorLobby {...props} />);
    expect(screen.getByTestId('projector-join-panel')).toHaveAttribute('data-compact', 'true');
    expect(tokens(screen.getByTestId('projector-code'))).toEqual(expect.arrayContaining(HERO_CODE_TEXT_COMPACT.split(' ')));
  });

  it('Start anyway (class still learning) is a real chunky button, not a dashed placeholder', () => {
    render(<ProjectorLobby {...props} readyUsernames={[]} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeEnabled();
    expect(tokens(start)).not.toContain('border-dashed');
    expect(chunky(start)).toBe(true);
  });

  it('on a short wall (720p projector) the words drop their definitions and wrap at their natural width, so Start stays on screen', () => {
    render(<ProjectorLobby {...props} />);
    expect(tokens(screen.getByTestId('projector-words-list'))).toEqual(expect.arrayContaining([`${SHORT_WALL}@5xl:flex`, `${SHORT_WALL}@5xl:flex-wrap`]));
    screen.getAllByTestId('projector-word-definition').forEach((d) => expect(tokens(d)).toContain(`${SHORT_WALL}hidden`));
  });

  it('on a short wall the Start bar sticks to the bottom edge, so Start never scrolls away', () => {
    render(<ProjectorLobby {...props} />);
    expect(tokens(screen.getByTestId('projector-start-bar'))).toEqual(expect.arrayContaining([`${SHORT_WALL}sticky`, `${SHORT_WALL}bottom-0`, `${SHORT_WALL}bg-neo-navy`]));
  });

  it('a locked Start reads as not-yet: dashed edge, no shadow', () => {
    render(<ProjectorLobby {...props} students={[]} readyUsernames={[]} onStartPracticeRound={undefined} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(tokens(start)).toEqual(expect.arrayContaining(['border-dashed', 'shadow-none']));
  });
});
