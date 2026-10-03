import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const fill = (s: string, count: number) => s.replace(/\{\{?count\}?\}/g, String(count));

describe('loose ends P2: free-tier limit copy reads as a plural for the real limits', () => {
  it.each([
    ['en', en, 'Up to 3 classes', 'Up to 50 students in each'],
    ['sv', sv, 'Upp till 3 klasser', 'Upp till 50 elever i varje'],
    ['he', he, 'עד 3 כיתות', 'עד 50 תלמידים בכל כיתה'],
    ['es', es, 'Hasta 3 clases', 'Hasta 50 estudiantes en cada una'],
    ['ru', ru, 'До 3 классов', 'До 50 учеников в каждом'],
  ] as const)('%s', (_l, bundle, classes, students) => {
    const pro = (bundle as any).education.landing.pro;
    expect(fill(pro.classLimit, 3)).toBe(classes);
    expect(fill(pro.studentLimit, 50)).toBe(students);
  });
});

describe('loose ends P2: the education header title is translated', () => {
  it.each([
    ['es', es, 'LexiClash Educación'],
    ['ru', ru, 'LexiClash Образование'],
  ] as const)('%s', (_l, bundle, title) => {
    expect((bundle as any).education.header.title).toBe(title);
  });

  it('ja keeps its own title', () => {
    expect((ja as any).education.header.title).not.toBe('LexiClash Education');
  });
});

describe('loose ends W9: the empty mastery state names what actually feeds it', () => {
  it('en says mastery comes from games played with a word list, live games included', () => {
    const empty = (en as any).eduPro.mastery.empty as string;
    expect(empty).toMatch(/word list/i);
    expect(empty).toMatch(/live/i);
  });
  it.each(Object.entries({ he, sv, ja, es, ru }))('%s is translated', (_l, bundle) => {
    expect((bundle as any).eduPro.mastery.empty).not.toBe((en as any).eduPro.mastery.empty);
  });
});
