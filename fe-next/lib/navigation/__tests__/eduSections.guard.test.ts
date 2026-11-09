import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { EDU_SECTIONS, eduSectionOf, surfaceOf } from '../eduSections';
import { classroomHubHref } from '../educationBackHref';
import { isEduAppSurface } from '../eduAppSurface';
import { isEducationPath } from '../sectionHome';
import { isAdFreeRoute } from '@/lib/admob-routes';
import { EDUCATION_SEO_TOP_LEVEL_SEGMENTS } from '../educationSeoSegments';
import { isEduAuthOrigin } from '../authReturnPath';
import { needsSessionRefresh } from '../sessionRefreshRoutes';
import { needsGameProviders } from '@/app/conditional-providers';
import { isQuietChromeSurface } from '@/components/education/shell/quietChromeRoutes';

// Every copy of the edu split, section by section. A row change is a behavior change.
const EXPECTED: Record<string, Record<(typeof EDU_SECTIONS)[number], boolean>> = {
  authOrigin:     { teacher: true, student: true, join: true, education: true, classroom: true, report: true, pricing: false },
  sessionRefresh: { teacher: true, student: true, join: true, education: false, classroom: true, report: false, pricing: false },
  gameProviders:  { teacher: true, student: true, join: true, education: false, classroom: false, report: false, pricing: false },
  quietChrome:    { teacher: true, student: true, join: false, education: false, classroom: false, report: false, pricing: true },
  adFree:         { teacher: true, student: true, join: true, education: true, classroom: true, report: true, pricing: false },
};

const CHECKS: Record<keyof typeof EXPECTED, (p: string) => boolean> = {
  authOrigin: isEduAuthOrigin,
  sessionRefresh: needsSessionRefresh,
  gameProviders: needsGameProviders,
  quietChrome: isQuietChromeSurface,
  adFree: (p) => isAdFreeRoute(p),
};

const COPY_FILES = [
  'lib/navigation/authReturnPath.ts',
  'lib/navigation/sessionRefreshRoutes.ts',
  'app/conditional-providers.tsx',
  'lib/admob-routes.ts',
  'components/education/shell/quietChromeRoutes.ts',
  'proxy.ts',
];

describe('every copy of the edu split reads eduSections', () => {
  for (const [check, row] of Object.entries(EXPECTED)) {
    it(`${check} matches its table for every section`, () => {
      for (const section of EDU_SECTIONS) {
        for (const p of [`/${section}`, `/he/${section}/x`]) {
          expect(CHECKS[check as keyof typeof EXPECTED](p), `${check} ${p}`).toBe(row[section]);
        }
      }
    });

    it(`${check} never claims a look-alike game path`, () => {
      for (const p of ['/en/teacher-appreciation', '/en/students-union', '/en/joined', '/en/reports-hub']) {
        expect(CHECKS[check as keyof typeof EXPECTED](p), `${check} ${p}`).toBe(false);
      }
    });
  }

  it('keeps live classroom play on the game stack and the session refresh', () => {
    expect(needsGameProviders('/en/education/live')).toBe(true);
    expect(needsSessionRefresh('/en/education/live/host')).toBe(true);
    expect(isQuietChromeSurface('/en/education/live')).toBe(true);
  });

  it.each(COPY_FILES)('%s holds no hand-written list of edu routes', (rel) => {
    const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
      .split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    expect(src).toMatch(/eduSections|sessionRefreshRoutes/);
    expect(src).not.toMatch(/['"]\/(teacher|student|join|classroom|report)['"]/);
    expect(src).not.toMatch(/\[\s*['"](teacher|student|join|classroom|report)['"]\s*\]/);
  });

  it('labels every analytics event with its surface', () => {
    expect(surfaceOf('/he/student/quick-play')).toBe('edu');
    expect(surfaceOf('/en/education/live?room=1')).toBe('edu');
    expect(surfaceOf('/en/daily')).toBe('game');
    expect(surfaceOf('/')).toBe('game');
    expect(surfaceOf(null)).toBe('game');
  });
});

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
