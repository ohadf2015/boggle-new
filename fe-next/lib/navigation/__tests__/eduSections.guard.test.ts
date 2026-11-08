import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { EDU_SECTIONS, eduSectionOf } from '../eduSections';
import { classroomHubHref } from '../educationBackHref';
import { isEduAppSurface } from '../eduAppSurface';
import { isEducationPath } from '../sectionHome';
import { isAdFreeRoute } from '@/lib/admob-routes';
import { EDUCATION_SEO_TOP_LEVEL_SEGMENTS } from '../educationSeoSegments';

describe('education sections', () => {
  it('names the section of a path with or without a locale', () => {
    expect(eduSectionOf('/he/teacher/classroom/abc')).toBe('teacher');
    expect(eduSectionOf('/classroom')).toBe('classroom');
    expect(eduSectionOf('/en/report/x?y=1')).toBe('report');
    expect(eduSectionOf('/en/daily')).toBeNull();
    expect(eduSectionOf('/en')).toBeNull();
  });

  it('every check treats every education section as education', () => {
    for (const section of EDU_SECTIONS) {
      const p = `/he/${section}`;
      expect(isEduAppSurface(p), `${p} app surface`).toBe(true);
      expect(isEducationPath(p), `${p} error home`).toBe(true);
      if (section !== 'pricing') expect(isAdFreeRoute(p), `${p} ad-free`).toBe(true);
    }
  });

  it('game pages stay game pages', () => {
    for (const p of ['/he', '/he/daily', '/he/multiplayer', '/he/word-tower']) {
      expect(isEduAppSurface(p), p).toBe(false);
      expect(isEducationPath(p), p).toBe(false);
    }
  });

  it('a new folder that looks like an education route must be listed', () => {
    const dir = path.join(process.cwd(), 'app/[locale]');
    const looksEdu = /teacher|student|classroom|education|school|lesson|class-|homework|parent/;
    const unlisted = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && looksEdu.test(d.name))
      .map((d) => d.name)
      .filter((name) => !EDU_SECTIONS.includes(name as (typeof EDU_SECTIONS)[number])
        && !EDUCATION_SEO_TOP_LEVEL_SEGMENTS.has(name)
        && !name.startsWith('lexiclash-vs-'));
    expect(unlisted).toEqual([]);
  });
});

describe('classroomHubHref', () => {
  it('waits until the role is known', () => {
    expect(classroomHubHref('he', { role: null, resolved: false })).toBeNull();
  });
  it('sends each viewer to their own home', () => {
    expect(classroomHubHref('he', { role: 'teacher', resolved: true })).toBe('/he/teacher');
    expect(classroomHubHref('he', { role: 'student', resolved: true })).toBe('/he/student');
    expect(classroomHubHref('he', { role: null, resolved: true })).toBe('/he/education');
  });
});
