import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
let liveInfo: { studyWordCount?: number } | null = null;
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => liveInfo }));
let cards: { word: string; definition?: string }[] = [];
const useProjectorStudyCards = vi.fn((_code: string, _enabled: boolean) => cards);
vi.mock('@/hooks/useProjectorStudyCards', () => ({
  useProjectorStudyCards: (code: string, enabled: boolean) => useProjectorStudyCards(code, enabled),
}));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

import ProjectorLobby from '../ProjectorLobby';
import { PROJECTOR_WORDS_MAX } from '../ProjectorWordPanel';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  students: [{ username: 'Ada' }],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — the lesson words on the wall', () => {
  beforeEach(() => {
    liveInfo = null;
    cards = [];
    useProjectorStudyCards.mockClear();
  });

  it('Given a lesson deck, Then the wall shows each word with its definition', () => {
    liveInfo = { studyWordCount: 2 };
    cards = [{ word: 'orbit', definition: 'a curved path around a planet' }, { word: 'comet' }];
    render(<ProjectorLobby {...props} />);
    const panel = screen.getByTestId('projector-words');
    expect(within(panel).getByText('education.projectorLobby.wordsTitle')).toBeInTheDocument();
    expect(within(panel).getByText('orbit')).toBeInTheDocument();
    expect(within(panel).getByText('a curved path around a planet')).toBeInTheDocument();
    expect(within(panel).getByText('comet')).toBeInTheDocument();
    expect(useProjectorStudyCards).toHaveBeenCalledWith('GHYRVS', true);
  });

  it('Given a full 40-word deck, Then the wall caps the list and says how many more', () => {
    liveInfo = { studyWordCount: 40 };
    cards = Array.from({ length: 40 }, (_, i) => ({ word: `word${i}` }));
    render(<ProjectorLobby {...props} />);
    const panel = screen.getByTestId('projector-words');
    expect(within(panel).getAllByTestId('projector-word')).toHaveLength(PROJECTOR_WORDS_MAX);
    expect(within(panel).getByTestId('projector-words-more')).toHaveTextContent(
      `education.projectorLobby.moreWords:{"count":${40 - PROJECTOR_WORDS_MAX}}`
    );
  });

  it('Given a room with no lesson words, Then no panel and no request', () => {
    render(<ProjectorLobby {...props} />);
    expect(screen.queryByTestId('projector-words')).toBeNull();
    expect(useProjectorStudyCards).toHaveBeenCalledWith('GHYRVS', false);
  });
});
