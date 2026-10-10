import { describe, it, expect } from 'vitest';
import { readLessonOutcome, writeLessonOutcome, LESSON_STORAGE_KEY } from './lessonStorage';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe('lessonStorage', () => {
  it('returns null for a player who has never finished or skipped the lesson', () => {
    expect(readLessonOutcome(memoryStorage())).toBeNull();
  });

  it('remembers a finished lesson', () => {
    const s = memoryStorage();
    writeLessonOutcome('done', s);
    expect(readLessonOutcome(s)).toBe('done');
    expect(s.getItem(LESSON_STORAGE_KEY)).toBe('done');
  });

  it('remembers a skipped lesson', () => {
    const s = memoryStorage();
    writeLessonOutcome('skipped', s);
    expect(readLessonOutcome(s)).toBe('skipped');
  });

  it('treats an unreadable storage as never-seen and never throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(readLessonOutcome(broken)).toBeNull();
    expect(() => writeLessonOutcome('done', broken)).not.toThrow();
  });
});
