'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import RouteLoading from '@/components/ui/RouteLoading';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { resolveEducationNav } from '@/components/education/shell/navItems';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';
import { HomeSkeletonPage } from '@/components/teacher/home/HomeSkeleton';
import { CLASSES_CONTENT_CLASS, LIBRARY_CONTENT_CLASS, REPORTS_CONTENT_CLASS } from './routeShellClasses';
import { ClassesSkeleton, GenericTeacherSkeleton, LibrarySkeleton, ReportsSkeleton } from './TeacherSkeletons';

type Variant = 'home' | 'classes' | 'library' | 'reports' | 'generic';

/** Tab → skeleton. Anything under /teacher that is not one of the four tabs keeps the chrome with a generic body. */
function variantFor(pathname: string | null): { variant: Variant; chrome: boolean } {
  const nav = resolveEducationNav(pathname);
  // Teacher screens that own no chrome (join sheet, projector, preview) keep the plain loader.
  const rest = (pathname ?? '').split('/').filter(Boolean);
  const teacherAt = rest.indexOf('teacher');
  const tail = teacherAt >= 0 ? rest.slice(teacherAt + 1) : [];
  const known = new Set(['classroom', 'curriculum', 'reports', 'profile', 'upgrade']);
  if (!nav || nav.kind !== 'teacher' || (tail.length > 0 && !known.has(tail[0]))) return { variant: 'generic', chrome: false };
  if (tail.length === 0) return { variant: 'home', chrome: true };
  if (tail.length === 1 && tail[0] === 'classroom') return { variant: 'classes', chrome: true };
  if (tail.length === 1 && tail[0] === 'curriculum') return { variant: 'library', chrome: true };
  if (tail.length === 1 && tail[0] === 'reports') return { variant: 'reports', chrome: true };
  return { variant: 'generic', chrome: true };
}

/**
 * The /teacher route fallback. The pages mount EducationShell themselves, so a bare full-page loader here
 * used to wipe the sidebar and top bar on every tab change and then paint them again with the page: the
 * chrome flashed away, a mascot showed, then a skeleton of a different shape followed. This keeps the chrome
 * on screen and shows the skeleton of the tab being opened, built from the page's own layout constants.
 */
export function TeacherRouteLoading() {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { variant, chrome } = variantFor(pathname);
  if (!chrome) return <RouteLoading />;

  const isRTL = language === 'he';
  switch (variant) {
    case 'home':
      return (
        <EducationShell className={cn(isRTL && 'rtl')} scrollRegionLabel={t('eduShell.home.regionLabel')} contentClassName="relative isolate">
          <HomeSkeletonPage />
        </EducationShell>
      );
    case 'classes':
      return (
        <EducationShell className={TEACHER_TV_SCALE} scrollRegionLabel={t('teacher.nav.classes')} contentClassName={CLASSES_CONTENT_CLASS}>
          <ClassesSkeleton />
        </EducationShell>
      );
    case 'library':
      return (
        <EducationShell scrollRegionLabel={t('teacher.nav.lessons')} contentClassName={LIBRARY_CONTENT_CLASS}>
          <LibrarySkeleton />
        </EducationShell>
      );
    case 'reports':
      return (
        <EducationShell className={TEACHER_TV_SCALE} scrollRegionLabel={t('teacher.reports.title')} contentClassName={REPORTS_CONTENT_CLASS}>
          <ReportsSkeleton />
        </EducationShell>
      );
    default:
      return (
        <EducationShell>
          <GenericTeacherSkeleton />
        </EducationShell>
      );
  }
}

export default TeacherRouteLoading;
