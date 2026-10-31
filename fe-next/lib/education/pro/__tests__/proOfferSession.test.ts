// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { claimProOfferSlot, firstProOfferReport, newProOfferMountId, resetProOfferSession } from '../proOfferSession';

describe('Teacher Pro offer session cap', () => {
  beforeEach(() => resetProOfferSession());

  it('the first mount in a session gets the full card, and keeps it on re-render', () => {
    const a = newProOfferMountId();
    expect(claimProOfferSlot('t1', a)).toBe('full');
    expect(claimProOfferSlot('t1', a)).toBe('full');
  });

  it('every later mount, on any placement, gets the compact link', () => {
    expect(claimProOfferSlot('t1', newProOfferMountId())).toBe('full');
    expect(claimProOfferSlot('t1', newProOfferMountId())).toBe('compact');
    expect(claimProOfferSlot('t1', newProOfferMountId())).toBe('compact');
  });

  it('is per teacher, and a new session starts over', () => {
    expect(claimProOfferSlot('t1', 'm1')).toBe('full');
    expect(claimProOfferSlot('t2', 'm2')).toBe('full');
    resetProOfferSession();
    expect(claimProOfferSlot('t1', 'm3')).toBe('full');
  });

  it('reports each placement/format/stage once per session', () => {
    expect(firstProOfferReport('t1', 'classroom_results', 'card', 'rendered')).toBe(true);
    expect(firstProOfferReport('t1', 'classroom_results', 'card', 'rendered')).toBe(false);
    expect(firstProOfferReport('t1', 'classroom_results', 'card', 'viewed')).toBe(true);
    expect(firstProOfferReport('t1', 'classroom_results', 'link', 'rendered')).toBe(true);
    expect(firstProOfferReport('t1', 'dashboard', 'card', 'rendered')).toBe(true);
    expect(firstProOfferReport('t2', 'classroom_results', 'card', 'rendered')).toBe(true);
  });

  it('mount ids are unique', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newProOfferMountId()));
    expect(ids.size).toBe(50);
  });
});
