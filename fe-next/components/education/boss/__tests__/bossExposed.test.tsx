/** The stagger payoff is visible on both screens: the projector chip and the phone callout read the server's exposed window. */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { BossExposedChip } from '../BossExposedChip';
import { PhoneBossBanner } from '../PhoneBossBanner';
import { useClassroomBossStore } from '@/stores/classroomBossStore';

const view = (over: Partial<ClassroomBossView> = {}): ClassroomBossView => ({
  bossId: 'lexiconDragon', hp: 60, maxHp: 100, phase: 2, status: 'fighting', telegraph: null, nextAttackMs: 9000,
  staggers: 1, shield: 0, shieldMax: 5, combo: { count: 0, multiplier: 1, msLeft: 0 }, lastHits: [], topHitters: [], effect: null,
  pctDealt: 40, ...over,
});

describe('exposed window UI', () => {
  afterEach(cleanup);

  it('given the server says the boss is exposed, then the projector shows the exposed chip', () => {
    useClassroomBossStore.getState().receiveState(view({ exposed: { msLeft: 4000, totalMs: 5000 } }));
    render(<BossExposedChip view={useClassroomBossStore.getState().view!} />);
    expect(screen.getByTestId('boss-exposed')).toHaveTextContent('classroomBoss.exposed');
  });

  it('given an older server view without the field, then nothing extra renders', () => {
    const { container } = render(<BossExposedChip view={view()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('given the boss is exposed, then the phone banner tells students to hit it now', () => {
    render(<PhoneBossBanner view={view({ exposed: { msLeft: 4000, totalMs: 5000 } })} cue={null} />);
    expect(screen.getByTestId('phone-boss-exposed')).toHaveTextContent('classroomBoss.exposedPhone');
  });

  it('given an attack is telegraphed while exposed, then the warning wins on the phone', () => {
    const tg = { kind: 'freeze' as const, msLeft: 5000, totalMs: 8000, longWords: 0, need: 3 };
    render(<PhoneBossBanner view={view({ exposed: { msLeft: 4000, totalMs: 5000 }, telegraph: tg })} cue={null} />);
    expect(screen.getByTestId('phone-boss-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-boss-exposed')).toBeNull();
  });
});
