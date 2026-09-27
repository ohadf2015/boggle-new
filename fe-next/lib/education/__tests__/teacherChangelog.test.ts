import { describe, it, expect, beforeEach } from 'vitest';
import {
  TEACHER_CHANGELOG,
  hasUnseenTeacherUpdate,
  markTeacherUpdatesSeen,
  WHATS_NEW_SEEN_KEY,
} from '../teacherChangelog';

describe('teacher changelog', () => {
  beforeEach(() => localStorage.clear());

  it('lists entries newest first, each with at least one item', () => {
    const dates = TEACHER_CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const entry of TEACHER_CHANGELOG) expect(entry.items.length).toBeGreaterThan(0);
  });

  it('has unique entry ids so a future entry re-lights the dot', () => {
    const ids = TEACHER_CHANGELOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is unseen until marked, then seen', () => {
    expect(hasUnseenTeacherUpdate()).toBe(true);
    markTeacherUpdatesSeen();
    expect(localStorage.getItem(WHATS_NEW_SEEN_KEY)).toBe(TEACHER_CHANGELOG[0].id);
    expect(hasUnseenTeacherUpdate()).toBe(false);
  });

  it('lights up again when a newer entry ships', () => {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, 'some-older-entry');
    expect(hasUnseenTeacherUpdate()).toBe(true);
  });

  it('never throws when storage is blocked', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(hasUnseenTeacherUpdate()).toBe(true);
      expect(() => markTeacherUpdatesSeen()).not.toThrow();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
