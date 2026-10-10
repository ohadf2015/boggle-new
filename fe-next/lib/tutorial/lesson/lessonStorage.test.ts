import { describe, it, expect } from 'vitest';
import { readLessonOutcome, writeLessonOutcome, lessonStorageKey } from './lessonStorage';

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
    expect(readLessonOutcome('classic', memoryStorage())).toBeNull();
  });

  it('remembers a finished lesson per mode', () => {
    const s = memoryStorage();
    writeLessonOutcome('classic', 'done', s);
    expect(readLessonOutcome('classic', s)).toBe('done');
    expect(s.getItem(lessonStorageKey('classic'))).toBe('done');
    expect(readLessonOutcome('blast', s)).toBeNull();
  });

  it('remembers a skipped lesson', () => {
    const s = memoryStorage();
    writeLessonOutcome('classic', 'skipped', s);
    expect(readLessonOutcome('classic', s)).toBe('skipped');
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
    expect(readLessonOutcome('classic', broken)).toBeNull();
    expect(() => writeLessonOutcome('classic', 'done', broken)).not.toThrow();
  });
});
