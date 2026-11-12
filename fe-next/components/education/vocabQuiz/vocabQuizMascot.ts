import { eduPoseFor } from '@/components/education/EduMascotReactions';
import type { MascotState } from '@/lib/blast/mascotState';
import type { EduMascotPose } from '@/lib/education/mascotArt';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';

// Routed through the bus's pose table so a quiz face and a practice pop are the same Lexi.
const STATE: Partial<Record<ExtendedMascotVariant, MascotState>> = {
  thinking: 'focused',
  spectating: 'idle',
  celebration: 'cheer',
  onfire: 'dancing',
  mindblown: 'awe',
  oops: 'oh',
  sad: 'sad-supportive',
  trophy: 'proud',
  panic: 'nervous',
  encouraging: 'wow',
};

export function vocabQuizPose(face: ExtendedMascotVariant): EduMascotPose {
  return eduPoseFor(STATE[face] ?? 'idle');
}
