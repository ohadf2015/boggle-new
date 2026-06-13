'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import { getStyleDanceClass } from '@/lib/playerStyle/styleDance';
import { getAnimatedMascot } from '@/lib/playerStyle/animatedMascots';

// Shared sizing so the static style mascot and the animated mascot occupy the
// exact same box — swapping between them never shifts layout (no CLS).
const SIZE_CLASS = 'w-[100px] h-[100px] sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48';

interface HeroStyleMascotProps {
  isMobilePortrait: boolean;
  /** cubes-landing treatment — livelier animated mascot. */
  energetic?: boolean;
}

/** The original lively mascot (transparent GIF) — used for `default` + on hover. */
function AnimatedHeroMascot({ isMobilePortrait, energetic }: HeroStyleMascotProps) {
  return (
    <IdleMascotWithEntrance
      baseVariant="happy"
      enableIdleActivities={!!energetic}
      cycleBaseVariants={!!energetic}
      size="xl"
      sizeClassName={SIZE_CLASS}
      enableHover={!isMobilePortrait}
      enableClick
      hoverVariant="excited"
      clickVariant="celebrating"
      clickAnimation="bounce"
      priority
      delay={0.1}
    />
  );
}

/**
 * Hero mascot that STARTS on the player's selected style and dances in a
 * genre-suited way. Desktop hover (or tap-less idle on mobile) swaps in the
 * lively animated mascot. `default` style keeps the original animated mascot
 * unchanged — its asset is an opaque JPG that wouldn't read as a free-floating
 * dancer, and default users should see zero change.
 */
export const HeroStyleMascot = memo(function HeroStyleMascot({
  isMobilePortrait,
  energetic,
}: HeroStyleMascotProps) {
  const { styleKey, style } = usePlayerStyle();
  const [revealed, setRevealed] = useState(false);

  if (styleKey === 'default' || revealed) {
    return (
      <div onMouseLeave={revealed ? () => setRevealed(false) : undefined}>
        <AnimatedHeroMascot isMobilePortrait={isMobilePortrait} energetic={energetic} />
      </div>
    );
  }

  // Prefer a real dancing GIF/WebP loop if this style has one; otherwise the
  // static PNG bops via a genre-suited CSS dance. The animated asset IS the
  // dance, so it carries no dance class.
  const animated = getAnimatedMascot(styleKey);
  const dance = animated ? '' : getStyleDanceClass(styleKey);
  return (
    <div
      data-testid="hero-style-mascot-box"
      // Desktop: hover reveals the animated mascot. Mobile: the dance is the life.
      onMouseEnter={isMobilePortrait ? undefined : () => setRevealed(true)}
      className={`relative ${SIZE_CLASS} ${dance}`.trim()}
    >
      <Image
        src={animated ?? style.mascot}
        alt=""
        fill
        sizes="(min-width: 1024px) 192px, (min-width: 768px) 160px, (min-width: 640px) 144px, 100px"
        className="object-contain select-none"
        draggable={false}
        priority
        // GIFs must bypass the image optimizer or they freeze on frame 1.
        unoptimized={!!animated}
        data-testid="hero-style-mascot"
      />
    </div>
  );
});

export default HeroStyleMascot;
