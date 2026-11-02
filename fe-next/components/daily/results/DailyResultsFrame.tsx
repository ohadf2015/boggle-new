import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One navy ground and width for every daily results screen; `aside` becomes the right column on desktop. */
export function DailyResultsFrame({
  children,
  aside,
  className,
  gap = 'gap-4',
  maxWidth = 'lg:max-w-5xl',
  testId = 'daily-results-frame',
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  /** Column gap; full class string so Tailwind emits it. */
  gap?: 'gap-3' | 'gap-4';
  maxWidth?: 'lg:max-w-4xl' | 'lg:max-w-5xl';
  testId?: string;
}) {
  return (
    <div data-testid={testId} className={cn('w-full bg-neo-navy', className)}>
      <div
        className={cn(
          'mx-auto w-full max-w-md px-4 lg:px-6',
          maxWidth,
          aside != null && 'lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8',
        )}
      >
        <div className={cn('flex min-w-0 flex-col', gap)}>{children}</div>
        {aside != null && <div className={cn('flex min-w-0 flex-col lg:sticky lg:top-4 lg:mt-0', gap, gap === 'gap-3' ? 'mt-3' : 'mt-4')}>{aside}</div>} 
      </div>
    </div>
  );
}

export default DailyResultsFrame;
