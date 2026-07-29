'use client';

import { memo } from 'react';
import Avatar from '@/components/Avatar';
import type { RoomPlayerAvatar } from '@/shared/types/game';
import { cn } from '@/lib/utils';

interface AvatarStackProps {
  avatars: RoomPlayerAvatar[];
  totalCount: number;
  /** Max avatars to render before showing +N overflow */
  maxVisible?: number;
  /** Avatar size — maps to Avatar component sizes */
  size?: 'sm' | 'md';
  className?: string;
}

const STACK_SIZES = {
  sm: {
    avatarSize: 'sm' as const,
    container: 'h-6',
    overlap: '-ms-2',
    overflow: 'w-6 h-6 text-[7px]',
    ring: 'ring-2',
  },
  md: {
    avatarSize: 'sm' as const,
    container: 'h-7',
    overlap: '-ms-2.5',
    overflow: 'w-7 h-7 text-[8px]',
    ring: 'ring-2',
  },
};

/**
 * Stacked avatar display for room lists.
 * Renders real Avatar components with overlapping layout.
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
            'relative rounded-full shrink-0',
            config.ring,
            'ring-neo-navy-light',
            i > 0 && config.overlap,
          )}
          style={{ zIndex: maxVisible - i }}
        >
          <Avatar
            customAvatar={av.customAvatar}
            avatarImage={av.avatarImage}
            userId={av.username || `room-player-${i}`}
            size={config.avatarSize}
          />
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
