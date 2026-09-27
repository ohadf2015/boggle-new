/**
 * Lexi reacting to the class run.
 *
 * Rendered here rather than via `components/ui/Mascot` because that component
 * hard-codes a fixed size class (not twMerge'd), and this surface needs the
 * mascot to shrink on a 390px teacher phone and grow on a 1440px projector.
 * Background handling still comes from the shared `mascotData` source of truth.
 */
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getMascotBgType, getMascotImagePath, type MascotVariant } from '@/components/ui/mascotData';

/** encouraging → warming up · onfire → streak · celebration → the class won. */
export type UnpluggedMood = 'encouraging' | 'onfire' | 'celebration';

const MOOD_VARIANT: Record<UnpluggedMood, MascotVariant> = {
  encouraging: 'encouraging',
  onfire: 'onfire',
  celebration: 'celebration',
};

/**
 * neo-orange is reserved for streak/fire, neo-yellow for celebration/gold.
 * Width is `border-[3px]`, NOT `border-neo-thick`: that utility sets the whole
 * `border` shorthand (black included) and twMerge drops it as a conflict with
 * the colour class, leaving the sticker with no ring at all.
 */
const MOOD_RING: Record<UnpluggedMood, string> = {
  encouraging: 'border-[3px] border-neo-cyan',
  onfire: 'border-[3px] border-neo-orange',
  celebration: 'border-[3px] border-neo-yellow',
};

export interface UnpluggedMascotProps {
  mood: UnpluggedMood;
  /** Sizing classes (width + height) — this component sets no size of its own. */
  className?: string;
  alt: string;
  priority?: boolean;
  /** Pop on mood change. Callers pass false for prefers-reduced-motion. */
  animate?: boolean;
  sizes?: string;
}

export function UnpluggedMascot({
  mood,
  className,
  alt,
  priority = false,
  animate = true,
  sizes = '(max-width: 640px) 25vw, 220px',
}: UnpluggedMascotProps) {
  const variant = MOOD_VARIANT[mood];
  const src = getMascotImagePath(variant);
  // 'nobg' art sits straight on navy; opaque art gets clipped into a sticker.
  const clipped = getMascotBgType(variant) !== 'nobg';

  return (
    <div
      // Remount on mood change so the pop replays; harmless when animate=false.
      key={mood}
      data-testid="unplugged-mascot"
      data-mood={mood}
      className={cn(
        'relative shrink-0',
        // Plain concatenation, not a cn() merge — see MOOD_RING.
        clipped && `overflow-hidden rounded-full ${MOOD_RING[mood]} bg-neo-navy shadow-hard`,
        animate && 'animate-neo-pop',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
        className={cn('object-contain', clipped && 'scale-110')}
      />
    </div>
  );
}
