import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBossMascotFeed } from '../useBossMascotFeed';
import { bossImpactBus } from '../fx/bossFxBus';
import type { BossCue } from '../useBossCues';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';
import type { ClassroomBossStatus } from '@/shared/types/classroomBoss';

type Props = { status: ClassroomBossStatus | null; cue: BossCue | null };

describe('useBossMascotFeed', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  const mount = (initial: Props) =>
    renderHook((p: Props) => useBossMascotFeed(p.status, p.cue), { initialProps: initial });

  it('fires nothing for the state it joins in, so a reconnect to a beaten boss stays quiet', () => {
    mount({ status: 'defeated', cue: null });
    expect(events).toHaveLength(0);
  });

  it('brings the crowd out once when the class beats the boss', () => {
    const { rerender } = mount({ status: 'fighting', cue: null });
    rerender({ status: 'defeated', cue: null });
    rerender({ status: 'defeated', cue: null });
    expect(events.filter((e) => e.kind === 'wave-clear')).toHaveLength(1);
  });

  it('is sad with the class, not at it, when the boss escapes', () => {
    const { rerender } = mount({ status: 'fighting', cue: null });
    rerender({ status: 'escaped', cue: null });
    expect(events).toContainEqual({ kind: 'wave-fail' });
  });

  it('gets bonked on a stagger and on a phase break', () => {
    const { rerender } = mount({ status: 'fighting', cue: null });
    rerender({ status: 'fighting', cue: { kind: 'staggered', id: 1 } });
    rerender({ status: 'phase-change', cue: { kind: 'phase', phase: 2, id: 2 } });
    expect(events.filter((e) => e.kind === 'cascade-detected')).toHaveLength(2);
  });

  it('reacts to a critical hit but not to every ordinary hit', () => {
    mount({ status: 'fighting', cue: null });
    act(() => bossImpactBus.emit({ crit: false }));
    expect(events).toHaveLength(0);
    act(() => bossImpactBus.emit({ crit: true }));
    expect(events).toHaveLength(1);
  });
});
