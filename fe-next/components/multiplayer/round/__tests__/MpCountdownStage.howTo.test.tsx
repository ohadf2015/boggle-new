/**
 * Each mode teaches itself in the 3-2-1 window, before the clock runs, so no
 * coach card ever floats over a live board.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GAME_MODE_RULES } from '@/backend/modes/rules';
import { MODE_COACH } from '@/lib/tutorial/modeCoachContent';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';

const { mode, boss } = vi.hoisted(() => ({ mode: { value: 'classic' as string | null }, boss: { value: false } }));
vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => mode.value }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/stores/classroomBossStore', () => ({ useBossActive: () => boss.value }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { MpCountdownStage, __resetCountdownDupGuard } from '../MpCountdownStage';

const t = (k: string) => k;

describe('MpCountdownStage how-to', () => {
  beforeEach(() => { __resetCountdownDupGuard(); boss.value = false; });

  it.each(Object.keys(GAME_MODE_RULES))('GIVEN a %s round WHEN the 3-2-1 plays THEN that mode\'s own how-to shows', (id) => {
    mode.value = id;
    render(<MpCountdownStage t={t} />);
    const coach = MODE_COACH[mpCoachMode(id)!];
    expect(screen.getByTestId('mp-countdown-howto')).toHaveTextContent(coach.steps[0].captionKey);
  });

  it('GIVEN a classroom Wheel Rush room WHEN the store still says classic THEN the teacher mode\'s how-to shows, not Classic\'s', () => {
    mode.value = 'classic';
    render(<MpCountdownStage t={t} classroom={{ mode: 'wheel-rush' }} />);
    expect(screen.getByTestId('mp-countdown-howto')).toHaveTextContent(MODE_COACH.wheelRush.steps[0].captionKey);
  });

  it('GIVEN a boss round WHEN the 3-2-1 plays THEN no board-mode how-to shows', () => {
    boss.value = true;
    render(<MpCountdownStage t={t} />);
    expect(screen.queryByTestId('mp-countdown-howto')).toBeNull();
  });
});
