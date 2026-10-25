import posthog from '@/lib/analytics/lazyPosthog';
import type { RehearsalSource } from './rehearsal';

export const EDU_REHEARSAL_STARTED = 'edu_rehearsal_started';

type Capture = (event: string, props?: Record<string, unknown>) => void;

export interface EduRehearsalStartedArgs {
  source: RehearsalSource;
  mode: string;
  classExists: boolean;
}

export function trackEduRehearsalStarted({ source, mode, classExists }: EduRehearsalStartedArgs): void {
  try {
    (posthog.capture as unknown as Capture)(EDU_REHEARSAL_STARTED, { source, mode, class_exists: classExists });
  } catch {
    /* analytics must never block a rehearsal */
  }
}
