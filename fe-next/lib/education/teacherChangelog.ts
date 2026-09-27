/**
 * Teacher "What's new" — the one place a classroom update is announced.
 *
 * To ship the next update: add an entry at the TOP (newest first) with a new
 * unique `id`, then add `education.whatsNew.entries.<id>.title` and one key per
 * item in all six locales. A new id re-lights the unread dot for every teacher.
 *
 * ponytail: the seen-marker is per device (localStorage). A teacher on a second
 * device sees the dot once more — harmless for a changelog; move it to a
 * profiles column only if that ever matters.
 */

export type WhatsNewIcon = 'gift' | 'trophy' | 'puzzle' | 'qr' | 'repeat' | 'chart' | 'book';

export interface TeacherChangelogEntry {
  /** Unique, never reused — it is what the seen-marker stores. */
  id: string;
  /** ISO date the update shipped. */
  date: string;
  items: Array<{ key: string; icon: WhatsNewIcon }>;
}

export const TEACHER_CHANGELOG: TeacherChangelogEntry[] = [
  {
    id: 'sep2026',
    date: '2026-09-19',
    items: [
      { key: 'chests', icon: 'gift' },
      { key: 'leaderboard', icon: 'trophy' },
      { key: 'wordcraft', icon: 'puzzle' },
      { key: 'join', icon: 'qr' },
      { key: 'rematch', icon: 'repeat' },
      { key: 'reports', icon: 'chart' },
      { key: 'packs', icon: 'book' },
    ],
  },
];

export const WHATS_NEW_SEEN_KEY = 'lexiclash_teacher_whats_new_seen';

export function hasUnseenTeacherUpdate(): boolean {
  try {
    return localStorage.getItem(WHATS_NEW_SEEN_KEY) !== TEACHER_CHANGELOG[0]?.id;
  } catch {
    return true;
  }
}

export function markTeacherUpdatesSeen(): void {
  try {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, TEACHER_CHANGELOG[0]?.id ?? '');
  } catch {
    /* storage blocked — the dot simply shows again next visit */
  }
}
