import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(join(__dirname, '../../TeacherDashboard.tsx'), 'utf8');
const at = (needle: string, from = 0) => src.indexOf(needle, from);

describe('Teacher Home next-lesson card position', () => {
  it('Given a class with no students yet, When the desk lists its blocks, Then the first-lesson ask comes straight after the hero, above the desk board', () => {
    const first = at('<HomeNextLesson');
    expect(first).toBeGreaterThan(at('<HomeHero'));
    expect(first).toBeLessThan(at('<HomeDeskBoard'));
    expect(src.slice(at('<HomeHero'), first)).toContain('noStudentsYet');
  });

  it('Given a class with students, When the desk lists its blocks, Then the booked-lesson card stays after the desk board and the week challenge', () => {
    const second = at('<HomeNextLesson', at('<HomeNextLesson') + 1);
    expect(second).toBeGreaterThan(at('<HomeWeekChallenge'));
    expect(at('<HomeWeekChallenge')).toBeGreaterThan(at('<HomeDeskBoard'));
    expect(at('<HomeDeskBoard')).toBeGreaterThan(at('<HomeHero'));
  });

  it('Given a class with no students yet, When the desk renders, Then the results link and the week challenge wait until someone joins', () => {
    expect(src).toMatch(/selectedClassroom && !noStudentsYet \? \(\s*<div data-tm>\s*<HomeDeskBoard/);
    expect(src).toMatch(/selectedClassroom && !noStudentsYet \? \(\s*<div data-tm>\s*<HomeWeekChallenge/);
  });

  it('Given the next-lesson card, When it mounts on Home, Then it reserves space only for a class with no students (the card above the desk)', () => {
    const card = readFileSync(join(__dirname, '../HomeNextLesson.tsx'), 'utf8');
    expect(card).toMatch(/reserveSpace=\{memberCount === 0\}/);
  });
});
