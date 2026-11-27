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
/** Sky wall: a 3px outline sitting on a solid bottom lip (shadow-edu-lip*, or the primary's own neoPress lip). */
const chunky = (el: Element) =>
  (tokens(el).includes('border-[3px]') || tokens(el).includes('border-4')) && tokens(el).some((c) => /^shadow-(edu-lip(-sm)?|\[0_\dpx_0_0\])$/.test(c));

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

  it('the join hero is a white card, with the address on a pink highlight and the code on cream tiles', () => {
    render(<ProjectorLobby {...props} />);
    const panel = tokens(screen.getByTestId('projector-join-panel'));
    expect(panel).toContain('bg-edu-surface');
    expect(panel).not.toContain('bg-neo-yellow');
    expect(tokens(screen.getByTestId('projector-join-address'))).toEqual(expect.arrayContaining(['bg-neo-pink', 'text-neo-black']));
    screen.getAllByTestId('projector-code-char').forEach((c) => expect(tokens(c)).toEqual(expect.arrayContaining(['bg-edu-tile', 'border-neo-black'])));
  });

  it('the classroom chip is the one purple sticker; the lesson chip stays white', () => {
    render(<ProjectorLobby {...props} />);
    const [session] = screen.getAllByTestId('projector-session-chip');
    expect(tokens(session)).toEqual(expect.arrayContaining(['bg-neo-purple', 'text-neo-white']));
  });

  it('a student who is not ready yet is quieter without a grey brightness filter (mud on sky)', () => {
    render(<ProjectorLobby {...props} readyUsernames={['Ada']} />);
    const ben = screen.getAllByTestId('projector-student').find((s) => s.getAttribute('data-dim') === 'true')!;
    expect(ben).toBeDefined();
    expect(tokens(ben).some((c) => c.startsWith('brightness-'))).toBe(false);
    expect(tokens(ben)).not.toContain('border-dashed');
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
    expect(tokens(screen.getByTestId('projector-start-bar'))).toEqual(expect.arrayContaining([`${SHORT_WALL}sticky`, `${SHORT_WALL}bottom-0`, `${SHORT_WALL}bg-edu-surface`]));
  });

  it('a locked Start reads as not-yet: dashed edge, no shadow', () => {
    render(<ProjectorLobby {...props} students={[]} readyUsernames={[]} onStartPracticeRound={undefined} />);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(tokens(start)).toEqual(expect.arrayContaining(['border-dashed', 'shadow-none']));
  });
});
