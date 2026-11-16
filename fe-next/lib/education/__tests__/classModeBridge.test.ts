/**
 * Post-game mode-bridge: a student who just finished a class or team round
 * gets one tap into a second mode, still carrying the class.
 */
import { describe, expect, it } from 'vitest';
import {
  CLASS_MODE_BRIDGE_EVENTS,
  classModeBridgeOffer,
  parseClassModeBridgeStart,
  secondSessionHref,
} from '../classModeBridge';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

describe('classModeBridgeOffer', () => {
  it('given a student who placed 2nd, when the class round ends, then the card says so and both second modes carry the class', () => {
    const offer = classModeBridgeOffer({
      isTeacher: false,
      classId: CLASS_ID,
      teacherName: 'Ms. X',
      rank: 2,
      hideRank: false,
      locale: 'en',
    });

    expect(offer).not.toBeNull();
    expect(offer?.title).toBe('Play again your way');
    expect(offer?.context).toBe("You were #2 in Ms. X's class");
    expect(offer?.modes.map((m) => m.id)).toEqual(['solo_daily', 'quick_play']);
    expect(offer?.modes[0].href).toContain(`class_id=${CLASS_ID}`);
    expect(offer?.modes[0].href).toContain('mode=solo_daily');
    expect(offer?.modes[1].href).toContain('mode=quick_play');
    expect(offer?.event).toEqual({ class_id: CLASS_ID });
  });

  it('given a teacher, or no class id, or a hidden leaderboard, then the placing is not offered as a second-mode hook', () => {
    expect(classModeBridgeOffer({
      isTeacher: true,
      classId: CLASS_ID,
      teacherName: 'Ms. X',
      rank: 1,
      hideRank: false,
      locale: 'en',
    })).toBeNull();

    expect(classModeBridgeOffer({
      isTeacher: false,
      classId: 'not-a-class',
      teacherName: 'Ms. X',
      rank: 2,
      hideRank: false,
      locale: 'en',
    })).toBeNull();

    const hidden = classModeBridgeOffer({
      isTeacher: false,
      classId: CLASS_ID,
      teacherName: 'Ms. X',
      rank: 2,
      hideRank: true,
      locale: 'en',
    });
    expect(hidden?.context).toBeNull();
    expect(hidden?.modes).toHaveLength(2);
    expect(hidden?.event).toEqual({ class_id: CLASS_ID });
  });

  it('names the three funnel events the retention read depends on', () => {
    expect(CLASS_MODE_BRIDGE_EVENTS).toEqual({
      offered: 'class_mode_bridge_offered',
      accepted: 'class_mode_bridge_accepted',
      started: 'second_session_started',
    });
  });
});

describe('second session handoff', () => {
  it('given an accepted tap, when the second session starts, then solo daily stays ad-free and quick play stays in the classroom product', () => {
    const start = parseClassModeBridgeStart(`class_id=${CLASS_ID}&mode=solo_daily&rank=2`);
    expect(start).toEqual({ classId: CLASS_ID, mode: 'solo_daily', rank: 2 });
    expect(secondSessionHref('en', start!)).toBe(
      `/en/daily?academy=1&class_id=${CLASS_ID}&from=class_mode_bridge`,
    );
    expect(secondSessionHref('he', { classId: CLASS_ID, mode: 'quick_play', rank: null })).toBe(
      `/he/student/quick-play?class_id=${CLASS_ID}&from=class_mode_bridge`,
    );
  });

  it('refuses a handoff that is not a class id and a known mode', () => {
    expect(parseClassModeBridgeStart('class_id=abc&mode=solo_daily')).toBeNull();
    expect(parseClassModeBridgeStart(`class_id=${CLASS_ID}&mode=rematch`)).toBeNull();
    expect(parseClassModeBridgeStart('')).toBeNull();
  });
});
