import React from 'react';
import { render, screen } from '@testing-library/react';

const { mode } = vi.hoisted(() => ({ mode: { value: 'classic' as string | null } }));
vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => mode.value }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));

import { MpCountdownStage, __resetCountdownDupGuard } from '../MpCountdownStage';

const t = (k: string) => k;

describe('MpCountdownStage in a classroom room', () => {
  beforeEach(() => {
    __resetCountdownDupGuard();
    mode.value = 'classic';
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
