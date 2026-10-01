import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';

vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => 'classic' }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
vi.mock('@/contexts/LanguageContext', async (orig) => ({
  ...(await orig<typeof import('@/contexts/LanguageContext')>()),
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));

import { MpCountdownStage, __resetCountdownDupGuard } from '@/components/multiplayer/round/MpCountdownStage';
import { ClassroomModeBanner } from '@/components/education/ClassroomModeBanner';
import { useFollowedClassroomGame } from '../useFollowedClassroomGame';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';

type Handler = (data?: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
const socket = {
  on: (ev: string, fn: Handler) => { (handlers.get(ev) ?? handlers.set(ev, new Set()).get(ev)!).add(fn); return socket; },
  off: (ev: string, fn: Handler) => { handlers.get(ev)?.delete(fn); return socket; },
  emit: () => socket,
} as unknown as Socket;
const fire = (ev: string, data?: unknown) => act(() => handlers.get(ev)?.forEach((fn) => fn(data)));

const RECORD: LiveClassroomGameInfo = {
  gameCode: 'JATS5Z',
  classroomId: 'c1',
  classroomName: 'ELA Period 3',
  lessonNames: ['Week 3'],
  gameMode: 'classic',
  settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true } as LiveClassroomGameInfo['settings'],
};

function StudentPhone({ countdown }: { countdown: boolean }) {
  const liveGame = useFollowedClassroomGame(socket, 'JATS5Z', RECORD);
  return (
    <>
      <ClassroomModeBanner lessonData={null} gameCode="JATS5Z" expanded isHost={false} liveGame={liveGame} />
      {countdown && <MpCountdownStage t={(k: string) => k} classroom={{ mode: liveGame?.gameMode ?? null }} />}
    </>
  );
}

describe('a student phone across a same-room game change (gate rule 9)', () => {
  beforeEach(() => {
    handlers.clear();
    __resetCountdownDupGuard();
  });

  it('Given a Classic round played, When the host switches to Vocab Quiz and starts, Then lobby and countdown both name the quiz', () => {
    const { rerender } = render(<StudentPhone countdown={false} />);
    fire('startGame', { gameMode: 'classic' });
    expect(screen.getByTestId('student-mode-strip')).toHaveAttribute('data-mode', 'classic');

    fire('classroomGameModeChanged', { gameCode: 'JATS5Z', gameMode: 'vocab-quiz' });
    expect(screen.getByTestId('student-mode-strip')).toHaveAttribute('data-mode', 'vocab-quiz');
    expect(screen.queryByText('mpUi.round.mode.classic.rule')).toBeNull();

    fire('startGame', { gameMode: 'classic', classroomMode: 'vocab-quiz' });
    rerender(<StudentPhone countdown />);
    expect(screen.getByTestId('mp-countdown')).toHaveAttribute('data-mode', 'vocab-quiz');
    expect(screen.getByTestId('mp-countdown-mode')).toHaveTextContent('teacher.classroom.gameModes.vocabQuiz');
    expect(screen.queryByText('mpUi.round.mode.classic.rule')).toBeNull();
  });
});
