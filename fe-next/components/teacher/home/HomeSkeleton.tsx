import { cn } from '@/lib/utils';
import { GAME_CARD, SKELETON } from './homeStyles';
import { HOME_GRID_BASE, HOME_GREETING_ROW, HOME_MAIN_COLUMN, HOME_RAIL_COLUMN, HOME_RAIL_COLUMNS } from './homeLayout';

/**
 * The shape of the Home desk while classes, stats and onboarding flags resolve: the class hero, the results bar,
 * the week-challenge card, the ready-made games row and the seat meter, in the heights the real desk settles at.
 * Nothing in it can flip later, and it is the same block the route fallback shows, so the loader never changes shape.
 */
export function HomeSkeleton() {
  return (
    <div data-testid="home-skeleton" aria-hidden="true" className="flex flex-col gap-3 sm:gap-4">
      <div className={cn(GAME_CARD, '@container/skel')}>
        <div className="grid gap-3 p-3 sm:gap-4 sm:p-5 @3xl/skel:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col gap-3">
            <span className={cn(SKELETON, 'h-4 w-1/3')} />
            <span className={cn(SKELETON, 'h-10 w-2/3')} />
            <span className={cn(SKELETON, 'h-5 w-1/2')} />
            <span className={cn(SKELETON, 'mt-auto h-[60px] w-full')} />
          </div>
          <span className={cn(SKELETON, 'min-h-28')} />
        </div>
      </div>
      <span className={cn(SKELETON, 'h-11 w-full')} />
      <div className={cn(GAME_CARD, 'flex h-[5.5rem] flex-col justify-center gap-2 p-3')}>
        <span className={cn(SKELETON, 'h-4 w-1/3')} />
        <span className={cn(SKELETON, 'h-3 w-3/4')} />
      </div>
      <div className="flex flex-col gap-2">
        <span className={cn(SKELETON, 'h-4 w-1/4')} />
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn(SKELETON, 'h-11')} />
          ))}
        </div>
      </div>
      <span className={cn(SKELETON, 'h-9 w-full')} />
    </div>
  );
}

export function HomeRailSkeleton() {
  return (
    <div aria-hidden="true" className={cn(GAME_CARD, 'flex min-h-32 flex-col gap-3 p-4')}>
      <span className={cn(SKELETON, 'h-6 w-1/2')} />
      <span className={cn(SKELETON, 'h-12')} />
      <span className={cn(SKELETON, 'h-9')} />
    </div>
  );
}

/** The whole Home page body while its route or access check resolves: the same grid as the page, greeting row included. */
export function HomeSkeletonPage() {
  return (
    <div data-testid="home-skeleton-page" className={cn(HOME_GRID_BASE, HOME_RAIL_COLUMNS)}>
      <div className={HOME_MAIN_COLUMN}>
        <div className={HOME_GREETING_ROW} aria-hidden="true">
          <span className={cn(SKELETON, 'h-[72px] min-w-0 flex-1 max-sm:self-stretch')} />
        </div>
        <HomeSkeleton />
      </div>
      <aside aria-hidden="true" className={HOME_RAIL_COLUMN}>
        <HomeRailSkeleton />
      </aside>
    </div>
  );
}
