import { EduMascot } from '@/components/education/EduMascot';
import { cn } from '@/lib/utils';
import type { EduMascotPose } from '@/lib/education/mascotArt';

/** Decorative mascot beside a page heading: desktop only, and its negative margin keeps it from adding height to the heading row. */
export function HeadingMascot({ moment, testId, className }: { moment: EduMascotPose; testId: string; className?: string }) {
  return (
    <span data-testid={testId} aria-hidden="true" className={cn('-my-7 shrink-0 max-lg:hidden', className)}>
      <EduMascot moment={moment} size={112} className="size-24 xl:size-28" />
    </span>
  );
}
