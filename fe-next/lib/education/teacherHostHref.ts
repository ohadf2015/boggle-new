// The one URL builder for "host a game" entry points (Home hero, class rows, class-ready, onboarding).

import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';

/** The lobby's own timer choices; anything else on the URL is ignored. */
export const HOST_TIMER_MINUTES = [1, 2, 3, 5] as const;

export interface TeacherHostTarget {
  classroomId?: string;
  mode?: ClassroomCatalogueId;
  minutes?: number;
}

export function teacherHostHref(locale: string, target: TeacherHostTarget): string {
  const params = new URLSearchParams();
  if (target.classroomId) params.set('classroomId', target.classroomId);
  if (target.mode) params.set('mode', target.mode);
  if (target.minutes) params.set('minutes', String(target.minutes));
  const query = params.toString();
  return `/${locale}/education/classroom-game${query ? `?${query}` : ''}`;
}

export function parseHostMode(raw: string | null | undefined): ClassroomCatalogueId | null {
  return catalogueEntry(raw)?.id ?? null;
}

export function parseHostMinutes(raw: string | null | undefined): number | null {
  const n = Number(raw);
  return (HOST_TIMER_MINUTES as readonly number[]).includes(n) ? n : null;
}
