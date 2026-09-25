import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GoogleClassroomError,
  listTeacherCourses,
  listCourseWork,
  createCourseWork,
  listAllStudents,
  listAllSubmissions,
  patchSubmissionGrade,
  returnSubmission,
} from '../googleClassroomApi';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('googleClassroomApi', () => {
  it('lists the teacher\'s ACTIVE courses with a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(json({ courses: [{ id: 'c1', name: 'Grade 5' }] }));
    const courses = await listTeacherCourses('tok');
    expect(courses).toEqual([{ id: 'c1', name: 'Grade 5' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://classroom.googleapis.com/v1/courses?');
    expect(String(url)).toContain('teacherId=me');
    expect(String(url)).toContain('courseStates=ACTIVE');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('lists courseWork with associatedWithDeveloper + maxPoints', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ courseWork: [{ id: 'w1', title: 'Lesson 1', maxPoints: 100, associatedWithDeveloper: true }] }),
    );
    const work = await listCourseWork('tok', 'c1');
    expect(work[0]).toMatchObject({ id: 'w1', maxPoints: 100, associatedWithDeveloper: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/courses/c1/courseWork?');
  });

  it('creates a PUBLISHED graded ASSIGNMENT', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'w9', title: 'Animals', maxPoints: 100, associatedWithDeveloper: true }));
    const cw = await createCourseWork('tok', 'c1', { title: 'Animals', maxPoints: 100 });
    expect(cw.id).toBe('w9');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://classroom.googleapis.com/v1/courses/c1/courseWork');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ title: 'Animals', maxPoints: 100, workType: 'ASSIGNMENT', state: 'PUBLISHED' });
  });

  it('paginates the roster with pageToken', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ students: [{ userId: 'g1' }], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(json({ students: [{ userId: 'g2' }] }));
    const roster = await listAllStudents('tok', 'c1');
    expect(roster.map((s) => s.userId)).toEqual(['g1', 'g2']);
    expect(String(fetchMock.mock.calls[1][0])).toContain('pageToken=p2');
  });

  it('paginates submissions', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ studentSubmissions: [{ id: 's1', userId: 'g1' }], nextPageToken: 'n' }))
      .mockResolvedValueOnce(json({}));
    const subs = await listAllSubmissions('tok', 'c1', 'w1');
    expect(subs).toEqual([{ id: 's1', userId: 'g1' }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/courses/c1/courseWork/w1/studentSubmissions?');
  });

  it('patches draftGrade only by default', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 's1' }));
    await patchSubmissionGrade('tok', 'c1', 'w1', 's1', 42, false);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://classroom.googleapis.com/v1/courses/c1/courseWork/w1/studentSubmissions/s1?updateMask=draftGrade',
    );
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ draftGrade: 42 });
  });

  it('patches draftGrade + assignedGrade when returning, and :return posts', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 's1' })).mockResolvedValueOnce(json({}));
    await patchSubmissionGrade('tok', 'c1', 'w1', 's1', 42, true);
    await returnSubmission('tok', 'c1', 'w1', 's1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('updateMask=draftGrade%2CassignedGrade');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ draftGrade: 42, assignedGrade: 42 });
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      'https://classroom.googleapis.com/v1/courses/c1/courseWork/w1/studentSubmissions/s1:return',
    );
  });

  describe('error mapping', () => {
    it('401 → reauth', async () => {
      fetchMock.mockResolvedValueOnce(json({ error: { status: 'UNAUTHENTICATED' } }, 401));
      await expect(listTeacherCourses('tok')).rejects.toMatchObject({ kind: 'reauth', status: 401 });
    });

    it('403 insufficient scope → reauth', async () => {
      fetchMock.mockResolvedValueOnce(
        json({ error: { status: 'PERMISSION_DENIED', message: 'Request had insufficient authentication scopes.' } }, 403),
      );
      await expect(listTeacherCourses('tok')).rejects.toMatchObject({ kind: 'reauth' });
    });

    it('403 that re-auth cannot fix (admin blocked API / not a course teacher) → forbidden, not a reauth loop', async () => {
      fetchMock.mockResolvedValueOnce(
        json({ error: { status: 'PERMISSION_DENIED', message: 'The caller does not have permission' } }, 403),
      );
      await expect(listTeacherCourses('tok')).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
    });

    it('403 ProjectPermissionDenied → not_linkable (courseWork made outside LexiClash)', async () => {
      fetchMock.mockResolvedValueOnce(
        json({ error: { status: 'PERMISSION_DENIED', message: '@ProjectPermissionDenied The Developer Console project is not permitted' } }, 403),
      );
      await expect(patchSubmissionGrade('tok', 'c', 'w', 's', 1, false)).rejects.toMatchObject({ kind: 'not_linkable' });
    });

    it('404 → not_found', async () => {
      fetchMock.mockResolvedValueOnce(json({ error: { status: 'NOT_FOUND' } }, 404));
      await expect(listCourseWork('tok', 'nope')).rejects.toMatchObject({ kind: 'not_found', status: 404 });
    });

    it('429 → rate_limited with retryAfter seconds', async () => {
      fetchMock.mockResolvedValueOnce(json({ error: {} }, 429, { 'retry-after': '30' }));
      const err = await listTeacherCourses('tok').catch((e) => e);
      expect(err).toBeInstanceOf(GoogleClassroomError);
      expect(err).toMatchObject({ kind: 'rate_limited', retryAfter: 30 });
    });

    it('network failure → unknown (not swallowed)', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(listTeacherCourses('tok')).rejects.toMatchObject({ kind: 'unknown' });
    });
  });
});
