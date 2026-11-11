import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { teacherEmailUrl } from '../teacherEmailLayout';

const ROOT = join(__dirname, '..', '..', '..', '..');
const TEMPLATES = join(ROOT, 'lib', 'email', 'templates');
const SOURCES = [
  ...readdirSync(TEMPLATES).filter((f) => /^teacher.*\.ts$/.test(f)).map((f) => join(TEMPLATES, f)),
  join(ROOT, 'lib', 'education', 'day2ValueEmail.ts'),
  join(ROOT, 'lib', 'education', 'abandonedCheckout.ts'),
];
// A hand-built link to a teacher page: `${SITE}/${locale}/teacher…`
const RAW_TEACHER_LINK = /\$\{(?:SITE|TEACHER_EMAIL_SITE)\}\/\$\{[^}]+\}\/teacher/;

describe('teacherEmailUrl', () => {
  it('tags a teacher link so the visit is attributed to the email that sent it', () => {
    expect(teacherEmailUrl('he', '/teacher/upgrade', 'weekly_digest')).toBe(
      'https://www.lexiclash.live/he/teacher/upgrade?utm_source=email&utm_medium=lifecycle&utm_campaign=weekly_digest',
    );
  });

  it('keeps extra params ahead of the tags and encodes spaces as %20', () => {
    expect(teacherEmailUrl('en', '/teacher/classroom/new', 'edu_share_code', { classroomId: 'c 1' })).toBe(
      'https://www.lexiclash.live/en/teacher/classroom/new?classroomId=c%201&utm_source=email&utm_medium=lifecycle&utm_campaign=edu_share_code',
    );
  });
});

describe('teacher email links', () => {
  it('finds the email sources', () => {
    expect(SOURCES.length).toBeGreaterThan(10);
  });

  it.each(SOURCES)('%s builds teacher links through teacherEmailUrl', (file) => {
    const src = readFileSync(file, 'utf8');
    const offenders = src.split('\n').filter((line) => RAW_TEACHER_LINK.test(line) && !line.includes('export function teacherEmailUrl'));
    expect(offenders).toEqual([]);
  });
});
