import { cn } from '@/lib/utils';
import { PANEL, SKELETON } from './homeStyles';

/** The shape of Home while classes, stats and onboarding flags resolve — nothing that can flip later. */
export function HomeSkeleton() {
  return (
    <div data-testid="home-skeleton" aria-hidden="true" className="flex flex-col gap-6">
      <div className={cn(PANEL, 'flex flex-col gap-4 p-4 sm:p-6')}>
        <span className={cn(SKELETON, 'h-8 w-2/3')} />
        <span className={cn(SKELETON, 'h-14 w-full sm:w-72')} />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn(SKELETON, 'h-20')} />
          ))}
        </div>
      </div>
      <div className={cn(PANEL, 'flex flex-col gap-3 p-4')}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn(SKELETON, 'h-10')} />
        ))}
      </div>
    </div>
  );
}

export function HomeRailSkeleton() {
  return (
    <div aria-hidden="true" className={cn(PANEL, 'flex flex-col gap-3 p-4')}>
      <span className={cn(SKELETON, 'h-6 w-1/2')} />
      <span className={cn(SKELETON, 'h-12')} />
    </div>
  );
}
