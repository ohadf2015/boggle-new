import { isEducationPath } from '@/lib/navigation/sectionHome';

/** The `?from=` TeacherGate wrote, if it is a safe in-app education path to return to. */
export function accessReturnPath(from: string | null | undefined): string | null {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) return null;
  if (!isEducationPath(from)) return null;
  const segs = from.split('?')[0].split('#')[0].split('/').filter(Boolean);
  if (segs[1] === 'education' && segs[2] === 'access') return null;
  return from;
}
