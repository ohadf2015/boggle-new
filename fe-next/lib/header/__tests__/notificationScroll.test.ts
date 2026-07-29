import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_FIT_THRESHOLD,
  notificationListScrollClass,
} from '../notificationScroll';

describe('notificationListScrollClass', () => {
  // Given a short list that fits within the menu, When deciding the wrapper
  // class, Then it must NOT become its own scroll container — otherwise it
  // traps the drag gesture and the side menu can't scroll (overscroll-contain
  // blocks chaining even when there's nothing to scroll).
  it('returns no scroll classes for a list at or below the fit threshold', () => {
    for (let count = 0; count <= NOTIFICATION_FIT_THRESHOLD; count++) {
      expect(notificationListScrollClass(count, 'max-h-72')).toBe('');
    }
  });

  // Given a long list that genuinely overflows, When deciding the wrapper
  // class, Then it becomes a contained scroll port so the drawer doesn't
  // scroll out from under an active inner scroll.
  it('returns max-height + contained scroll classes once the list overflows', () => {
    const cls = notificationListScrollClass(NOTIFICATION_FIT_THRESHOLD + 1, 'max-h-72');
    expect(cls).toContain('max-h-72');
    expect(cls).toContain('overflow-y-auto');
    expect(cls).toContain('overscroll-contain');
  });

  it('honours the caller-supplied max-height class', () => {
    expect(notificationListScrollClass(20, 'max-h-64')).toContain('max-h-64');
    expect(notificationListScrollClass(20, 'max-h-64')).not.toContain('max-h-72');
  });

  it('threshold is a small positive integer (items that fit without scrolling)', () => {
    expect(Number.isInteger(NOTIFICATION_FIT_THRESHOLD)).toBe(true);
    expect(NOTIFICATION_FIT_THRESHOLD).toBeGreaterThan(0);
  });
});
