import type { SchoolLeadPayload, SchoolLeadRole, StudentCountBucket } from '@/lib/education/schoolLead';
import type { TeacherLocale } from '@/lib/education/types';

const LEAD_LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es'];
export const MAX_QUOTE_TEACHERS = 500;

export interface SchoolQuoteInput {
  fullName: string;
  email: string;
  school: string;
  role: SchoolLeadRole;
  teachers: number;
  message: string;
  requester: string;
  locale: string;
}

export function clampTeachers(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QUOTE_TEACHERS, Math.max(1, Math.round(n)));
}

// The lead table sizes deals by students; ~25 per teacher is the planning ratio sales already uses.
export function studentBucketForTeachers(teachers: number): StudentCountBucket {
  const students = clampTeachers(teachers) * 25;
  if (students < 50) return 'lt_50';
  if (students < 200) return '50_200';
  if (students < 500) return '200_500';
  if (students < 2000) return '500_2000';
  return 'gte_2000';
}

export function buildSchoolQuotePayload(input: SchoolQuoteInput): SchoolLeadPayload {
  const teachers = clampTeachers(input.teachers);
  const lines = [`Teacher Pro quote request: ${teachers} teacher${teachers === 1 ? '' : 's'}.`];
  if (input.requester) lines.push(`Requested on behalf of: ${input.requester}.`);
  if (input.message.trim()) lines.push(input.message.trim());
  const locale = (LEAD_LOCALES as string[]).includes(input.locale) ? (input.locale as TeacherLocale) : 'en';
  return {
    email: input.email.trim().toLowerCase(),
    full_name: input.fullName.trim(),
    role: input.role,
    school_or_district: input.school.trim(),
    student_count: studentBucketForTeachers(teachers),
    interests: ['pricing_info'],
    message: lines.join('\n').slice(0, 800),
    locale,
    source: 'teacher-upgrade',
  };
}

export function schoolQuoteErrorKey(status: number): string {
  if (status === 429) return 'eg2Pro.school.errorRateLimited';
  if (status === 400) return 'eg2Pro.school.errorInvalid';
  return 'eg2Pro.school.errorGeneric';
}
