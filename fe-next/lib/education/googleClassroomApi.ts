/**
 * Minimal Google Classroom REST client (plain fetch — `googleapis` is not a
 * dependency). Server-only: callers pass the teacher's access token from the
 * encrypted cookie. Every non-2xx is thrown as a typed GoogleClassroomError so
 * routes can map it to a clear UI state (re-auth / not found / slow down).
 */

const BASE = 'https://classroom.googleapis.com/v1';

export type GoogleClassroomErrorKind =
  | 'reauth'
  | 'forbidden'
  | 'not_linkable'
  | 'not_found'
  | 'rate_limited'
  | 'unknown';

export class GoogleClassroomError extends Error {
  constructor(
    public kind: GoogleClassroomErrorKind,
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'GoogleClassroomError';
  }
}

export interface GcCourse {
  id: string;
  name: string;
  section?: string;
}

export interface GcCourseWork {
  id: string;
  title: string;
  maxPoints?: number;
  associatedWithDeveloper?: boolean;
  state?: string;
}

export interface GcStudent {
  userId: string;
  profile?: { emailAddress?: string | null } | null;
}

export interface GcSubmission {
  id: string;
  userId: string;
  state?: string;
}

async function mapError(res: Response): Promise<GoogleClassroomError> {
  let message = `Google Classroom ${res.status}`;
  try {
    const body = (await res.json()) as {
      error?: { message?: string; status?: string; details?: Array<{ reason?: string }> };
    };
    if (body?.error?.message) message = body.error.message;
    const reason = body?.error?.details?.find((d) => d?.reason)?.reason;
    if (reason) message = `${message} [${reason}]`;
  } catch {
    /* non-JSON error body: keep status text */
  }
  if (res.status === 401) return new GoogleClassroomError('reauth', 401, message);
  if (res.status === 403) {
    if (/ProjectPermissionDenied|Developer Console project/i.test(message)) {
      return new GoogleClassroomError('not_linkable', 403, message);
    }
    // Only a missing scope is fixable by re-consenting. Anything else (Workspace
    // admin blocked the API, not a teacher of this course) would loop on Connect.
    if (/insufficient.*scope|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(message)) {
      return new GoogleClassroomError('reauth', 403, message);
    }
    return new GoogleClassroomError('forbidden', 403, message);
  }
  if (res.status === 404) return new GoogleClassroomError('not_found', 404, message);
  if (res.status === 429) {
    const ra = Number(res.headers.get('retry-after'));
    return new GoogleClassroomError('rate_limited', 429, message, Number.isFinite(ra) && ra > 0 ? ra : 60);
  }
  return new GoogleClassroomError('unknown', res.status, message);
}

async function gcFetch<T>(token: string, url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    throw new GoogleClassroomError('unknown', 0, `Google Classroom unreachable: ${(err as Error).message}`);
  }
  if (!res.ok) throw await mapError(res);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

const enc = encodeURIComponent;

async function paginate<T>(token: string, baseUrl: string, key: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  // Hard stop at 50 pages (5,000 rows) — a classroom never gets near it.
  for (let page = 0; page < 50; page++) {
    const url = new URL(baseUrl);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const body = await gcFetch<Record<string, unknown>>(token, url.toString());
    out.push(...((body[key] as T[] | undefined) ?? []));
    pageToken = typeof body.nextPageToken === 'string' ? body.nextPageToken : undefined;
    if (!pageToken) break;
  }
  return out;
}

export async function listTeacherCourses(token: string): Promise<GcCourse[]> {
  const rows = await paginate<GcCourse>(token, `${BASE}/courses?teacherId=me&courseStates=ACTIVE`, 'courses');
  return rows.map((c) => ({ id: c.id, name: c.name, ...(c.section ? { section: c.section } : {}) }));
}

export async function listCourseWork(token: string, courseId: string): Promise<GcCourseWork[]> {
  const rows = await paginate<GcCourseWork>(token, `${BASE}/courses/${enc(courseId)}/courseWork?courseWorkStates=PUBLISHED`, 'courseWork');
  return rows.map((w) => ({
    id: w.id,
    title: w.title,
    maxPoints: w.maxPoints,
    associatedWithDeveloper: w.associatedWithDeveloper === true,
  }));
}

export function createCourseWork(
  token: string,
  courseId: string,
  input: { title: string; maxPoints: number },
): Promise<GcCourseWork> {
  return gcFetch<GcCourseWork>(token, `${BASE}/courses/${enc(courseId)}/courseWork`, {
    method: 'POST',
    body: { title: input.title, maxPoints: input.maxPoints, workType: 'ASSIGNMENT', state: 'PUBLISHED' },
  });
}

export function getCourseWork(token: string, courseId: string, courseWorkId: string): Promise<GcCourseWork> {
  return gcFetch<GcCourseWork>(token, `${BASE}/courses/${enc(courseId)}/courseWork/${enc(courseWorkId)}`);
}

export function listAllStudents(token: string, courseId: string): Promise<GcStudent[]> {
  return paginate<GcStudent>(token, `${BASE}/courses/${enc(courseId)}/students`, 'students');
}

export function listAllSubmissions(token: string, courseId: string, courseWorkId: string): Promise<GcSubmission[]> {
  return paginate<GcSubmission>(
    token,
    `${BASE}/courses/${enc(courseId)}/courseWork/${enc(courseWorkId)}/studentSubmissions`,
    'studentSubmissions',
  );
}

export function patchSubmissionGrade(
  token: string,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
  grade: number,
  assign: boolean,
): Promise<unknown> {
  const mask = assign ? 'draftGrade,assignedGrade' : 'draftGrade';
  const url = `${BASE}/courses/${enc(courseId)}/courseWork/${enc(courseWorkId)}/studentSubmissions/${enc(submissionId)}?updateMask=${enc(mask)}`;
  return gcFetch(token, url, { method: 'PATCH', body: assign ? { draftGrade: grade, assignedGrade: grade } : { draftGrade: grade } });
}

export function returnSubmission(token: string, courseId: string, courseWorkId: string, submissionId: string): Promise<unknown> {
  return gcFetch(
    token,
    `${BASE}/courses/${enc(courseId)}/courseWork/${enc(courseWorkId)}/studentSubmissions/${enc(submissionId)}:return`,
    { method: 'POST', body: {} },
  );
}
