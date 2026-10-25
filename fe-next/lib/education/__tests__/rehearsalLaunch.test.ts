import { describe, it, expect } from 'vitest';
import { buildRehearsalLaunch } from '../rehearsalLaunch';

const packName = (key: string) => `name:${key}`;

describe('buildRehearsalLaunch', () => {
  it('Given the teacher has a list with words, Then the rehearsal reuses their newest list instead of minting a new one', () => {
    const intent = buildRehearsalLaunch({
      lessons: [
        { id: 'new', name: 'Week 6', language: 'en', words: [{ word: 'river' }] },
        { id: 'old', name: 'Week 1', language: 'en', words: [{ word: 'cat' }] },
      ],
      uiLanguage: 'he',
      classroomId: 'class-1',
      packName,
    });
    expect(intent).toMatchObject({ source: 'lesson', lessonId: 'new', title: 'Week 6', language: 'en', classroomId: 'class-1', mode: 'classic' });
  });

  it('Given only empty lists, Then the rehearsal falls back to the starter pack in the teacher language', () => {
    const intent = buildRehearsalLaunch({
      lessons: [{ id: 'empty', name: 'Draft', language: 'en', words: [] }],
      uiLanguage: 'he',
      classroomId: undefined,
      packName,
    });
    expect(intent).toMatchObject({ source: 'pack', language: 'he', mode: 'classic' });
    expect(intent.packKey).toBe('education.starterPacks.beginnerHebrew.name');
    expect(intent.title).toBe('name:education.starterPacks.beginnerHebrew.name');
    expect(intent.classroomId).toBeUndefined();
  });

  it('Given a UI language with no starter pack, Then the English pack is used', () => {
    const intent = buildRehearsalLaunch({ lessons: [], uiLanguage: 'xx', classroomId: 'c', packName });
    expect(intent).toMatchObject({ source: 'pack', language: 'en', packKey: 'education.starterPacks.commonEnglish.name' });
  });
});
