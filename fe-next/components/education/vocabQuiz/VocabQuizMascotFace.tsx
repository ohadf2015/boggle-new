'use client';

import { EduMascot } from '@/components/education/EduMascot';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';
import { cn } from '@/lib/utils';
import { vocabQuizPose } from './vocabQuizMascot';

const BORDER = {
  cyan: 'border-neo-cyan',
  lime: 'border-neo-lime',
  purple: 'border-neo-purple',
  white: 'border-edu-line',
} as const;

interface VocabQuizMascotFaceProps {
  face: ExtendedMascotVariant;
  /** Size classes for the frame; the art fills it. */
  className?: string;
  shape?: 'circle' | 'rounded-square';
  border?: keyof typeof BORDER;
  bg?: 'navy' | 'elevated';
  /** false: the art alone, no ring, for spots where Lexi stands free on the page. */
  framed?: boolean;
  alt: string;
}

/** Lexi in the quiz, drawn in the classroom art inside a framed slot. A reaction, never a control. */
export function VocabQuizMascotFace({ face, className, shape = 'circle', border = 'cyan', bg = 'navy', framed = true, alt }: VocabQuizMascotFaceProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        'pointer-events-none block shrink-0',
        framed && 'overflow-hidden border-[3px] p-[8%]',
        framed && (shape === 'circle' ? 'rounded-full' : 'rounded-neo'),
        framed && BORDER[border],
        framed && (bg === 'navy' ? 'bg-edu-surface' : 'bg-edu-surface'),
        className
      )}
    >
      <EduMascot moment={vocabQuizPose(face)} size={128} className="size-full" />
    </span>
  );
}
