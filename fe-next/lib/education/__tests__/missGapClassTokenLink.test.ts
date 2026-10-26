import { describe, it, expect } from 'vitest';
import {
  buildMissGapAssignmentGoogleClassroomUrl,
  buildMissGapAssignmentPath,
  buildMissGapAssignmentShareUrl,
  toMissGapAssignmentPayload,
} from '../missGapAsyncAssignment';
import { resolveMissGapEntry } from '../missGapEntry';
import { buildMissGapGradePassback } from '../missGapGradePassback';
import {
  buildMissGapWhatsAppCardPath,
  buildMissGapWhatsAppCardShareUrl,
  buildMissGapWhatsAppDeepLink,
} from '../missGapWhatsAppShare';

const TOKEN =
  'eyJjbGFzc0tleSI6InBoeXNpY3MgMTAxOjptcy4gY29oZW4iLCJ2IjoxfQ.abcDEF_123-xyz';

const input = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-11',
};

describe('homework links carry the signed class token as k=', () => {
  it('the teacher share link contains the token', () => {
    const url = new URL(buildMissGapAssignmentShareUrl({ ...input, classToken: TOKEN }));
    expect(url.searchParams.get('k')).toBe(TOKEN);
    expect(url.searchParams.get('role')).toBe('student');
  });

  it('the Google Classroom envelope wraps a link that contains the token', () => {
    const gc = buildMissGapAssignmentGoogleClassroomUrl({
      input: { ...input, classToken: TOKEN },
      title: 't',
      body: 'b',
    });
    const homework = new URL(new URL(gc).searchParams.get('url') ?? '');
    expect(homework.searchParams.get('k')).toBe(TOKEN);
  });

  it('a built payload keeps the token too, so student re-shares keep it', () => {
    const payload = toMissGapAssignmentPayload({ ...input, classToken: TOKEN });
    expect(payload.classToken).toBe(TOKEN);
    expect(toMissGapAssignmentPayload(payload).classToken).toBe(TOKEN);
    expect(new URL(buildMissGapAssignmentPath(payload), 'https://x').searchParams.get('k')).toBe(TOKEN);
  });

  it('a link with no token has no k= at all', () => {
    const url = new URL(buildMissGapAssignmentShareUrl(input));
    expect(url.searchParams.has('k')).toBe(false);
    expect(toMissGapAssignmentPayload(input).classToken).toBe('');
  });

  it.each([
    ['markup', '<script>alert(1)</script>'],
    ['spaces', 'abc def.ghi'],
    ['an oversized value', `${'a'.repeat(600)}.b`],
  ])('drops a k value that cannot be a token (%s)', (_label, bad) => {
    expect(toMissGapAssignmentPayload({ ...input, classToken: bad }).classToken).toBe('');
  });

  it('the student entry reads k back from the shared URL', () => {
    const shared = new URL(buildMissGapAssignmentShareUrl({ ...input, classToken: TOKEN }));
    const { payload, teacherMode } = resolveMissGapEntry(shared.searchParams, 'en');
    expect(teacherMode).toBe(false);
    expect(payload.classToken).toBe(TOKEN);
  });

  it('the grade passback homework link keeps the token it was given', () => {
    const result = buildMissGapGradePassback({
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      missed_words: ['neutron'],
      due: '2026-09-11',
      classToken: TOKEN,
    });
    expect(result.ok).toBe(true);
    const homeworkUrl = (result as { homeworkUrl: string }).homeworkUrl;
    expect(new URL(homeworkUrl).searchParams.get('k')).toBe(TOKEN);
  });

  it('the parent WhatsApp card link and its deep link keep the token', () => {
    const withToken = { ...input, classToken: TOKEN };
    expect(new URL(buildMissGapWhatsAppCardShareUrl(withToken)).searchParams.get('k')).toBe(TOKEN);
    expect(new URL(buildMissGapWhatsAppCardPath(withToken), 'https://x').searchParams.get('k')).toBe(TOKEN);
    const deep = decodeURIComponent(buildMissGapWhatsAppDeepLink({ text: 'hi', input: withToken }));
    expect(deep).toContain(`k=${TOKEN}`);
  });
});
