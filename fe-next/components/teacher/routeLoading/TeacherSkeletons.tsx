'use client';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { CLASS_GRID_QUERIES, classesPerView } from '@/components/teacher/hq/classPaging';
import { GAME_CARD, SKELETON } from '@/components/teacher/home/homeStyles';

/**
 * Loading bodies for the teacher tabs. Each mirrors the markup it stands in for (same wrappers, columns, gaps and
 * card heights) and is used BOTH by the route fallback and by the page's own in-flight state, so a teacher sees one
 * placeholder that the real content replaces in place, instead of a loader, a different skeleton and then the page.
 */

/** Columns the live Classes grid uses before any class has loaded: never fewer than two, like `classesPerView`. */
export function useClassGridColumns(): number {
  const sm = useMediaQuery(CLASS_GRID_QUERIES.sm);
  const lg = useMediaQuery(CLASS_GRID_QUERIES.lg);
  const short = useMediaQuery(CLASS_GRID_QUERIES.short);
  return classesPerView({ sm, lg, short }, 0);
}

/** Same `<ul>` and gap as ClassroomManager's grid, one placeholder per column. */
export function ClassGridSkeleton({ columns }: { columns: number }) {
  return (
    <ul
      data-testid="class-grid-skeleton"
      aria-hidden="true"
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }, (_, i) => (
        <li key={i} className="flex">
          <div className={cn(GAME_CARD, 'flex h-[16.5rem] w-full flex-col overflow-hidden')}>
            <span className="h-14 shrink-0 bg-neo-cream/10" />
            <div className="flex flex-1 flex-col gap-3 p-3.5">
              <span className={cn(SKELETON, 'h-4 w-1/2')} />
              <span className={cn(SKELETON, 'h-16 w-full')} />
              <span className={cn(SKELETON, 'mt-auto h-14 w-full')} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Top row of ClassroomManager: the page title and its one action. */
export function ClassesTopRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2" aria-hidden="true">
      <span className={cn(SKELETON, 'h-8 w-40 sm:h-9')} />
      <span className={cn(SKELETON, 'h-10 w-28')} />
    </div>
  );
}

export function ClassesSkeleton() {
  const columns = useClassGridColumns();
  return (
    <main data-testid="classes-skeleton" className="relative mx-auto max-w-6xl">
      <div className="space-y-3 sm:space-y-4 [@media(orientation:landscape)_and_(max-height:500px)]:space-y-1.5">
        <ClassesTopRowSkeleton />
        <ClassGridSkeleton columns={columns} />
      </div>
    </main>
  );
}

/** My lists grid, as LessonBuilder lays it out: 224px list cards, 1 / 2 / 3 columns by container width. */
export function ListGridSkeleton() {
  return (
    <div data-testid="my-lists-skeleton" aria-hidden="true" className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className={cn(SKELETON, 'h-11 w-32')} />
      </div>
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn(SKELETON, 'h-56 rounded-neo-lg', i === 2 && 'hidden @5xl:block')} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <main data-testid="library-skeleton" className="mx-auto max-w-6xl">
      <div className="space-y-8">
        <section className="space-y-3" aria-hidden="true">
          <span className={cn(SKELETON, 'block h-8 w-40 sm:h-9')} />
          <ListGridSkeleton />
        </section>
        <section className="space-y-3 border-t-[3px] border-dashed border-neo-cream/20 pt-6" aria-hidden="true">
          <span className={cn(SKELETON, 'block h-7 w-32 sm:h-8')} />
          <span className={cn(SKELETON, 'block h-11 w-full')} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="h-[104px] animate-pulse rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-light sm:h-[144px]" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/** Reports landing: title row, value line, section title, then the class picker's cards. */
export function ReportsSkeleton() {
  return (
    <div data-testid="reports-skeleton" aria-hidden="true">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className={cn(SKELETON, 'h-8 w-48 sm:h-9')} />
      </div>
      <span className={cn(SKELETON, '-mt-3 mb-6 block h-5 w-full max-w-prose')} />
      <span className={cn(SKELETON, 'mb-3 block h-5 w-40')} />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-20 rounded-neo bg-neo-cream/10 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Any other teacher screen (a class, set-up, profile): keeps the chrome with a plain title and two panels. */
export function GenericTeacherSkeleton() {
  return (
    <div data-testid="teacher-generic-skeleton" aria-hidden="true" className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <span className={cn(SKELETON, 'h-8 w-48 sm:h-9')} />
      <span className={cn(SKELETON, 'h-40 w-full')} />
      <span className={cn(SKELETON, 'h-40 w-full')} />
    </div>
  );
}
