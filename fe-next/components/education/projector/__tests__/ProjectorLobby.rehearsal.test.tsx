import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));
vi.mock('../RehearsalBotsBlocked', () => ({ RehearsalBotsBlocked: () => <div data-testid="rehearsal-bots-blocked" /> }));

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
const bots = [
  { username: 'Bot Ada', isBot: true },
  { username: 'Bot Lin', isBot: true },
];

describe('ProjectorLobby — rehearsing before the class arrives', () => {
  it('Given an empty room, Then the rehearsal is labeled private and uncounted', () => {
    render(<ProjectorLobby {...props} />);
    expect(screen.getByTestId('projector-practice-round')).toBeInTheDocument();
    expect(screen.getByTestId('rehearsal-private-note')).toHaveTextContent('education.projectorLobby.rehearsePrivate');
  });

  it('Given only bots are seated after a practice round, Then practice stays the one live action and Start waits for a student', () => {
    render(<ProjectorLobby {...props} students={bots} />);
    expect(screen.getByTestId('projector-practice-round')).toBeEnabled();
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(start).toHaveTextContent('education.projectorLobby.startWhenReady');
  });

  it('Given a real student joined beside the bots, Then practice is gone and Start is live', () => {
    render(<ProjectorLobby {...props} students={[...bots, { username: 'Noa' }]} />);
    expect(screen.queryByTestId('projector-practice-round')).toBeNull();
    expect(screen.getByTestId('projector-start')).toBeEnabled();
  });

  it('Given a mode bots cannot play, Then the lobby says so instead of offering a practice that never runs', () => {
    render(<ProjectorLobby {...props} classroomGameMode="wordcraft" />);
    expect(screen.queryByTestId('projector-practice-round')).toBeNull();
    expect(screen.getByTestId('rehearsal-bots-blocked')).toBeInTheDocument();
  });
});
