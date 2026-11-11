import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => false }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('../fx/BossFxLayer', () => ({ BossFxLayer: () => null }));
vi.mock('../BossStageArt', () => ({ BossStageArt: () => null }));
vi.mock('../BossHpBar', () => ({ BossHpBar: () => null }));
vi.mock('../BossTopHitters', () => ({ BossTopHitters: () => null }));
vi.mock('../BossAttackClock', () => ({ BossAttackClock: () => null }));
vi.mock('../BossShieldMeter', () => ({ BossShieldMeter: () => null }));
vi.mock('../BossStageFooter', () => ({ BossStageFooter: () => null }));
vi.mock('../BossStageOverlays', () => ({ BossStageOverlays: () => null }));
vi.mock('../BossExposedChip', () => ({ BossExposedChip: () => null }));
vi.mock('../useBossStageSounds', () => ({ useBossStageSounds: () => {} }));

import { ProjectorBossStage } from '../ProjectorBossStage';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { _resetMascotBus } from '@/lib/blast/mascotBus';

const view = (status: ClassroomBossView['status']) =>
  ({
    bossId: 'dragon',
    hp: status === 'defeated' ? 0 : 50,
    maxHp: 100,
    phase: 1,
    status,
    telegraph: null,
    nextAttackMs: null,
    shield: 0,
    shieldMax: 3,
    combo: { count: 0, multiplier: 1, msLeft: 0 },
    lastHits: [],
    topHitters: [],
    effect: null,
    staggers: 0,
    pctDealt: 0,
  }) as unknown as ClassroomBossView;

describe('ProjectorBossStage — mascot crowd', () => {
  beforeEach(() => {
    _resetMascotBus();
    localStorage.clear();
  });

  it('brings the mascot crowd onto the TV when the class beats the boss', () => {
    act(() => useClassroomBossStore.setState({ view: view('fighting') }));
    render(<ProjectorBossStage remainingTime={60} />);
    expect(screen.queryByTestId('edu-mascot-crowd')).toBeNull();
    act(() => useClassroomBossStore.setState({ view: view('defeated') }));
    expect(screen.getByTestId('edu-mascot-crowd')).toBeTruthy();
  });
});
