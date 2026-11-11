import { cn } from '@/lib/utils';
import { GAME_CARD, SKELETON } from './homeStyles';

/** The shape of Home while classes, stats and onboarding flags resolve — nothing that can flip later. */
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
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn(SKELETON, 'min-h-[4.75rem]', i === 3 && 'max-sm:col-span-3 max-sm:min-h-[3.25rem]')} />
        ))}
      </div>
    </div>
  );
}

export function HomeRailSkeleton() {
  return (
    <div aria-hidden="true" className={cn(GAME_CARD, 'flex flex-col gap-3 p-4')}>
      <span className={cn(SKELETON, 'h-6 w-1/2')} />
      <span className={cn(SKELETON, 'h-12')} />
    </div>
  );
}
