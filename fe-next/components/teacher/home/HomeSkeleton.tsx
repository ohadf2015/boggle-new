import { cn } from '@/lib/utils';
import { NB_PANEL } from '../nb/nbStyles';
import { SKELETON } from './homeStyles';
import { HOME_FIRST_FRAME, HOME_GRID_BASE, HOME_MAIN_COLUMN } from './homeLayout';

/**
 * The shape of the Home desk while classes, stats and onboarding flags resolve: the hero panel and the results row,
 * filling the first screen like the real desk. Nothing in it can flip later, and it is the same block the route
 * fallback shows, so the loader never changes shape.
 */
export function HomeSkeleton() {
  return (
    <div data-testid="home-skeleton" aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-5">
        <span className={cn(SKELETON, 'size-[72px] shrink-0 rounded-full lg:size-20')} />
        <span className={cn(SKELETON, 'h-16 w-full max-w-md')} />
      </div>
      <div className={cn(NB_PANEL, 'flex flex-1 flex-col justify-center @container/skel')}>
        <div className="grid gap-4 p-3 sm:gap-5 sm:p-6 @3xl/skel:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @3xl/skel:gap-x-8 @3xl/skel:p-8">
          <div className="flex flex-col gap-4">
            <span className={cn(SKELETON, 'h-11 w-2/3')} />
            <span className={cn(SKELETON, 'h-5 w-1/2')} />
            <span className={cn(SKELETON, 'h-[72px] w-full sm:h-[84px]')} />
            <span className={cn(SKELETON, 'h-[60px] w-full sm:h-[68px]')} />
          </div>
          <span className={cn(SKELETON, 'h-36 w-full self-center sm:h-44')} />
        </div>
      </div>
      <span className={cn(SKELETON, 'h-[60px] w-full shrink-0')} />
    </div>
  );
}

/** The whole Home page body while its route or access check resolves: the same grid as the page. */
export function HomeSkeletonPage() {
  return (
    <div data-testid="home-skeleton-page" className={HOME_GRID_BASE}>
      <div className={cn(HOME_MAIN_COLUMN, HOME_FIRST_FRAME)}>
        <HomeSkeleton />
      </div>
    </div>
  );
}
