import type { TeacherLocale } from '@/lib/education/types';

// ── Qualification registries (the load-bearing "is this a payable lead" signal) ──
// Roles that map to budget authority sit alongside classroom roles so we can
// segment a casual teacher from a decision-maker who can sign a school/district deal.
export const SCHOOL_LEAD_ROLES = [
  'teacher',
  'head_of_department',
  'curriculum_lead',
  'school_admin',
  'district_admin',
  'other',
] as const;
export type SchoolLeadRole = (typeof SCHOOL_LEAD_ROLES)[number];

// Student-count bucket = payer-size proxy. District licensing is per-student, so
// this is the single strongest "how much could this lead pay" predictor.
export const STUDENT_COUNT_BUCKETS = [
  'lt_50',
  '50_200',
  '200_500',
  '500_2000',
  'gte_2000',
] as const;
export type StudentCountBucket = (typeof STUDENT_COUNT_BUCKETS)[number];

// Interest in a paid surface = explicit paying intent. `pricing_info` is the hottest.
export const SCHOOL_LEAD_INTERESTS = [
  'district_admin_dashboard',
  'analytics',
  'content_libraries',
  'ad_free',
  'sso',
  'pricing_info',
] as const;
export type SchoolLeadInterest = (typeof SCHOOL_LEAD_INTERESTS)[number];

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SchoolLeadPayload {
  email: string;
  full_name: string;
  role: SchoolLeadRole;
  school_or_district: string;
  student_count: StudentCountBucket;
  interests: SchoolLeadInterest[];
  country?: string;
  message?: string;
  locale: TeacherLocale;
}

export type SchoolLeadValidation =
  | { ok: true; payload: SchoolLeadPayload }
  | { ok: false; error: string };

export function validateSchoolLeadPayload(body: unknown): SchoolLeadValidation {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid body' };
  const b = body as Record<string, unknown>;

  const email = b.email;
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid email' };

  const full_name = b.full_name;
  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 120)
    return { ok: false, error: 'invalid full_name' };

  if (!SCHOOL_LEAD_ROLES.includes(b.role as SchoolLeadRole)) return { ok: false, error: 'invalid role' };

  const school_or_district = b.school_or_district;
  if (typeof school_or_district !== 'string' || school_or_district.trim().length < 2 || school_or_district.length > 200)
    return { ok: false, error: 'invalid school_or_district' };

  if (!STUDENT_COUNT_BUCKETS.includes(b.student_count as StudentCountBucket))
    return { ok: false, error: 'invalid student_count' };

  // interests optional → default []; validate + dedupe (preserve first-seen order)
  let interests: SchoolLeadInterest[] = [];
  if (b.interests !== undefined) {
    if (!Array.isArray(b.interests)) return { ok: false, error: 'invalid interests' };
    const seen = new Set<string>();
    for (const it of b.interests) {
      if (!SCHOOL_LEAD_INTERESTS.includes(it as SchoolLeadInterest)) return { ok: false, error: 'invalid interest value' };
      if (!seen.has(it as string)) {
        seen.add(it as string);
        interests.push(it as SchoolLeadInterest);
      }
    }
  }

  const country = b.country;
  if (country !== undefined && country !== '' && (typeof country !== 'string' || country.length > 80))
    return { ok: false, error: 'invalid country' };

  const message = b.message;
  if (message !== undefined && message !== '' && (typeof message !== 'string' || message.length > 800))
    return { ok: false, error: 'invalid message' };

  if (!LOCALES.includes(b.locale as TeacherLocale)) return { ok: false, error: 'invalid locale' };

  return {
    ok: true,
    payload: {
      email,
      full_name,
      role: b.role as SchoolLeadRole,
      school_or_district,
      student_count: b.student_count as StudentCountBucket,
      interests,
      country: country ? (country as string) : undefined,
      message: message ? (message as string) : undefined,
      locale: b.locale as TeacherLocale,
    },
  };
}
