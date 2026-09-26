'use client';

import { memo, useMemo } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { RoomPlayerAvatar } from '@/shared/types/game';
import { cn } from '@/lib/utils';

interface AvatarStackProps {
  avatars: RoomPlayerAvatar[];
  totalCount: number;
  /** Max avatars to render before showing +N overflow */
  maxVisible?: number;
  /** Stack density: sm = 24px faces, md = 28px faces */
  size?: 'sm' | 'md';
  className?: string;
}

// A TV (the `tv:` variant) scales every size 1.5x, like the rest of the entry.
// `px` is the renderer's drawing size; the SVG fills its box at any size.
const STACK_SIZES = {
  sm: {
    px: 36,
    face: 'w-6 h-6 tv:w-9 tv:h-9',
    container: 'h-6 tv:h-9',
    overlap: '-ms-2 tv:-ms-3',
    overflow: 'w-6 h-6 text-[7px] tv:w-9 tv:h-9 tv:text-[11px]',
    ring: 'ring-2',
  },
  md: {
    px: 42,
    face: 'w-7 h-7 tv:w-[42px] tv:h-[42px]',
    container: 'h-7 tv:h-[42px]',
    overlap: '-ms-2.5 tv:-ms-4',
    overflow: 'w-7 h-7 text-[8px] tv:w-[42px] tv:h-[42px] tv:text-xs',
    ring: 'ring-2',
  },
};

/**
 * One face in the stack: the player's own avatar, else the same deterministic
 * avatar components/Avatar would seed from their username. It uses the renderer
 * directly because the entry already ships it statically (EntryIdentity), and
 * Avatar's lazy renderer would put an async loader in EntryScreen's SSR'd chunk
 * group (entry/__tests__/entryChunkGroup.test.ts).
 */
function StackFace({ customAvatar, seed, px }: { customAvatar?: CustomAvatarConfig; seed: string; px: number }) {
  const config = useMemo(
    () => customAvatar ?? getSeededAvatarConfig(hashString(seed)),
    [customAvatar, seed],
  );
  return <AvatarRenderer config={config} size={px} circular crop="face" disableEffects className="h-full w-full" />;
}

/**
 * Stacked avatar display for room lists.
 * Renders real avatars with an overlapping layout.
 */
const AvatarStack = memo<AvatarStackProps>(({
  avatars,
  totalCount,
  maxVisible = 4,
  size = 'sm',
  className,
}) => {
  const config = STACK_SIZES[size];
  const visible = avatars.slice(0, maxVisible);
  const overflow = totalCount - visible.length;

  if (visible.length === 0) return null;

  return (
    <div
      className={cn('flex items-center', config.container, className)}
      data-testid="avatar-stack"
    >
      {visible.map((av, i) => (
        <div
          key={av.username || `avatar-${i}`}
          className={cn(
            'relative rounded-full overflow-hidden shrink-0',
            config.face,
            config.ring,
            'ring-neo-navy-light',
            i > 0 && config.overlap,
          )}
          style={{ zIndex: maxVisible - i }}
        >
          <StackFace customAvatar={av.customAvatar} seed={av.username || `room-player-${i}`} px={config.px} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'relative rounded-full shrink-0 flex items-center justify-center',
            'bg-neo-navy border-2 border-white/20 font-black text-white',
            config.overflow,
            config.overlap,
          )}
          style={{ zIndex: 0 }}
          data-testid="avatar-stack-overflow"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
});

AvatarStack.displayName = 'AvatarStack';

export default AvatarStack;
