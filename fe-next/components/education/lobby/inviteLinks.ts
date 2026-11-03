import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { QUICK_LAUNCH_FLOW, type QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

export const FIRST_ROUND_MINUTES = 2;

function knownPack(packKey: string | null | undefined) {
  return packKey ? STARTER_LESSON_PACKS.find((p) => p.nameKey === packKey) ?? null : null;
}

export function inviteHref(locale: string, classroomId: string, packKey?: string | null): string {
  const params = new URLSearchParams({ classroomId });
  if (knownPack(packKey)) params.set('pack', packKey as string);
  return `/${locale}/teacher/classroom/new?${params.toString()}`;
}

export interface InviteStartTarget {
  href: string;
  /** Written at tap time, never earlier: the intent's 5-minute TTL must not run while the teacher shares the code. */
  intent: Omit<QuickLaunchIntent, 'createdAt' | 'title'> | null;
}

export function inviteStartTarget({ locale, classroomId, packKey }: { locale: string; classroomId: string; packKey: string | null | undefined }): InviteStartTarget {
  const pack = knownPack(packKey);
  if (!pack) return { href: teacherHostHref(locale, { classroomId, minutes: FIRST_ROUND_MINUTES }), intent: null };
  return {
    href: `/${locale}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`,
    intent: { source: 'pack', packKey: pack.nameKey, language: pack.language, classroomId },
  };
}

export function safeReturnTo(raw: string | null | undefined, locale: string): string | null {
  if (!raw || !raw.startsWith(`/${locale}/`)) return null;
  if (raw.includes('\\') || raw.includes('..') || raw.includes('//')) return null;
  return raw;
}

export function libraryHref(locale: string, classroomId: string | null | undefined): string {
  const lobby = teacherHostHref(locale, classroomId ? { classroomId } : {});
  const params = new URLSearchParams();
  if (classroomId) params.set('classroomId', classroomId);
  params.set('returnTo', lobby);
  return `/${locale}/teacher/curriculum?${params.toString()}`;
}

/** `prev === null` is the first settled read: a class that already had students is not a "first student" moment. */
export function firstStudentSeen(prev: number | null, next: number): boolean {
  return prev === 0 && next > 0;
}
