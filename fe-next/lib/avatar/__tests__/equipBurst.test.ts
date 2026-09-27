import { planEquipBurst } from '../equipBurst';

describe('planEquipBurst', () => {
  it('no particle spray for a free→free swap (wobble carries it)', () => {
    const b = planEquipBurst('free', 'free');
    expect(b.particles).toBe(0);
    expect(b.celebrate).toBe(false);
  });

  it('celebrates a tier upgrade with a full spray', () => {
    const b = planEquipBurst('free', 'legendary');
    expect(b.celebrate).toBe(true);
    expect(b.particles).toBeGreaterThanOrEqual(20);
    expect(b.color).toBe('#FFD700');
  });

  it('escalates particle count with tier', () => {
    const vip = planEquipBurst('free', 'vip').particles;
    const epic = planEquipBurst('free', 'epic').particles;
    const leg = planEquipBurst('free', 'legendary').particles;
    expect(vip).toBeLessThan(epic);
    expect(epic).toBeLessThan(leg);
  });

  it('gives a smaller, non-celebration burst when re-equipping within the same tier', () => {
    const up = planEquipBurst('free', 'epic');
    const same = planEquipBurst('epic', 'epic');
    expect(same.celebrate).toBe(false);
    expect(same.particles).toBeGreaterThan(0);
    expect(same.particles).toBeLessThan(up.particles);
  });

  it('uses the new tier color', () => {
    expect(planEquipBurst('free', 'vip').color).toBe('#00FFFF');
    expect(planEquipBurst('vip', 'epic').color).toBe('#A855F7');
  });
});
