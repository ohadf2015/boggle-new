import { describe, it, expect } from 'vitest';
import { homeOnboarding } from '../homeOnboarding';

describe('homeOnboarding', () => {
  it('Given a brand-new teacher, Then step 1 (create a class) is current and the card shows', () => {
    const o = homeOnboarding({ classroomCount: 0, inviteCopied: false, liveStarted: false, dismissed: false });
    expect(o.steps.map((s) => [s.id, s.status])).toEqual([
      ['createClass', 'current'],
      ['shareCode', 'todo'],
      ['tryDemo', 'todo'],
    ]);
    expect(o.visible).toBe(true);
    expect(o.doneCount).toBe(0);
  });

  it('Given a class whose code was shown, Then the demo is next', () => {
    const o = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, dismissed: false });
    expect(o.current).toBe('tryDemo');
    expect(o.doneCount).toBe(2);
  });

  it('Given a class but no share yet, Then sharing is next (never skipped)', () => {
    expect(homeOnboarding({ classroomCount: 2, inviteCopied: false, liveStarted: true, dismissed: false }).current).toBe('shareCode');
  });

  it('Given every step done, Then the card goes away for good', () => {
    const o = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: true, dismissed: false });
    expect(o.complete).toBe(true);
    expect(o.visible).toBe(false);
  });

  it('Given a teacher who dismissed it, Then it stays hidden even with steps left', () => {
    expect(homeOnboarding({ classroomCount: 1, inviteCopied: false, liveStarted: false, dismissed: true }).visible).toBe(false);
  });

  it('Given no classes, Then dismissing is not offered: the card IS the empty state', () => {
    const o = homeOnboarding({ classroomCount: 0, inviteCopied: false, liveStarted: false, dismissed: true });
    expect(o.visible).toBe(true);
    expect(o.dismissible).toBe(false);
  });

  it('Given a room opened but no real round, Then tryDemo stays open and asks for players', () => {
    const o = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, roomOpened: true, dismissed: false });
    expect(o.current).toBe('tryDemo');
    expect(o.awaitingPlayers).toBe(true);
  });

  it('Given no room opened yet, Then the demo nudge is the plain one', () => {
    const o = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, roomOpened: false, dismissed: false });
    expect(o.current).toBe('tryDemo');
    expect(o.awaitingPlayers).toBe(false);
  });

  it('Given a real round already happened, Then nothing is awaiting players', () => {
    const o = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: true, roomOpened: true, dismissed: false });
    expect(o.complete).toBe(true);
    expect(o.awaitingPlayers).toBe(false);
  });
});
