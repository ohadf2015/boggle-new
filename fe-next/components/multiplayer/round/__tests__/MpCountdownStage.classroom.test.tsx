import React from 'react';
import { render, screen } from '@testing-library/react';

const { mode } = vi.hoisted(() => ({ mode: { value: 'classic' as string | null } }));
vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => mode.value }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));

import { MpCountdownStage, __resetCountdownDupGuard } from '../MpCountdownStage';
import { ingestLessonClaimsRound } from '@/components/education/live/useLessonClaims';
import { useClassroomContextStore } from '@/hooks/gameState/classroomContextStore';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('MpCountdownStage in a classroom room', () => {
  beforeEach(() => {
    __resetCountdownDupGuard();
    mode.value = 'classic';
    ingestLessonClaimsRound({});
    useClassroomContextStore.setState({ level: 'core', wordBank: [] });
  });

  it('Given a classroom board round with lesson words in the race, Then the countdown names the goal and skips the generic how-to', () => {
    ingestLessonClaimsRound({ lessonClaims: { roundId: 1, total: 6, claimedCount: 0, slots: [] } });
    render(<MpCountdownStage t={t} classroom={{ mode: 'classic' }} />);
    expect(screen.getByTestId('mp-countdown-goal')).toHaveTextContent('eduStudent.countdown.goal:{"count":6}');
    expect(screen.getByTestId('mp-countdown-goal')).toHaveTextContent('eduStudent.countdown.goalBonus:{"bonus":5}');
    expect(screen.queryByTestId('mp-countdown-howto')).toBeNull();
    expect(screen.queryByTestId('mp-countdown-rule')).toBeNull();
  });

  it('Given a solo practice round with no race, Then the goal counts the lesson words the student was sent', () => {
    useClassroomContextStore.setState({ level: 'core', wordBank: ['storm', 'cell', 'leaf'] });
    render(<MpCountdownStage t={t} classroom={{ mode: 'classic' }} />);
    expect(screen.getByTestId('mp-countdown-goal')).toHaveTextContent('eduStudent.countdown.goal:{"count":3}');
  });

  it('Given a Vocab Quiz with lesson words, Then it keeps the quiz rule, since every question is a lesson word', () => {
    useClassroomContextStore.setState({ level: 'core', wordBank: ['storm', 'cell'] });
    render(<MpCountdownStage t={t} classroom={{ mode: 'vocab-quiz' }} />);
    expect(screen.queryByTestId('mp-countdown-goal')).toBeNull();
    expect(screen.getByTestId('mp-countdown-rule')).toBeInTheDocument();
  });

  it('Given a Vocab Quiz, Then the countdown announces the quiz, not Classic', () => {
    render(<MpCountdownStage t={t} classroom={{ mode: 'vocab-quiz' }} />);
    expect(screen.getByTestId('mp-countdown-mode')).toHaveTextContent('teacher.classroom.gameModes.vocabQuiz');
    expect(screen.getByTestId('mp-countdown-rule')).toHaveTextContent('eduStudent.mode.vocabQuiz.rule');
    expect(screen.getByTestId('mp-countdown')).toHaveAttribute('data-mode', 'vocab-quiz');
  });

  it('Given Wordcraft, Then it explains crafting, not dragging', () => {
    render(<MpCountdownStage t={t} classroom={{ mode: 'wordcraft' }} />);
    expect(screen.getByTestId('mp-countdown-rule')).toHaveTextContent('eduStudent.mode.wordcraft.rule');
  });

  it('Given the room mode has not resolved yet, Then it shows a neutral badge, never Classic', () => {
    render(<MpCountdownStage t={t} classroom={{ mode: null }} />);
    expect(screen.getByTestId('mp-countdown-mode')).toHaveTextContent('eduStudent.mode.pending');
    expect(screen.queryByText('mpUi.round.mode.classic.rule')).toBeNull();
  });

  it('Given a classroom board mode, Then it keeps the round rule copy', () => {
    render(<MpCountdownStage t={t} classroom={{ mode: 'word-hunt' }} />);
    expect(screen.getByTestId('mp-countdown-rule')).toHaveTextContent('mpUi.round.mode.wordHunt.rule');
  });

  it('outside a classroom it still follows the store mode', () => {
    mode.value = 'blast';
    render(<MpCountdownStage t={t} />);
    expect(screen.getByTestId('mp-countdown-mode')).toHaveTextContent('mpUi.round.mode.blast.name');
  });
});

describe('classroomRoundModeMeta — Boss Battle', () => {
  it('announces the boss fight, not the quiz engine under it', async () => {
    const { classroomRoundModeMeta } = await import('../roundModes');
    const meta = classroomRoundModeMeta('vocab-quiz', 'boss');
    expect(meta.nameKey).toBe('eg2Modes.boss.name');
    expect(meta.ruleKey).toBe('eg2Modes.boss.how');
    expect(classroomRoundModeMeta('vocab-quiz').nameKey).toBe('teacher.classroom.gameModes.vocabQuiz');
  });
});
