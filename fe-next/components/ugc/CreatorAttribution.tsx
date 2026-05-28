'use client';

import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface CreatorAttributionProps {
  displayName: string;
  avatar?: CustomAvatarConfig | null;

  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { avatar: 'sm' as const, text: 'text-xs' },
  md: { avatar: 'md' as const, text: 'text-sm' },
  lg: { avatar: 'lg' as const, text: 'text-base' },
} as const;

/**
 * CreatorAttribution — shows avatar + "Created by {name}" prominently.
 * Reusable on board cards, play screens, leaderboards.
 */
export function CreatorAttribution({
  displayName,
  avatar,
  size = 'md',
  className,
}: CreatorAttributionProps) {
  const { t } = useLanguage();
  const { avatar: avatarSize, text } = SIZE_MAP[size];

  const label = t('ugc.board.createdBy', { name: displayName });

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      aria-label={label}
    >
      <Avatar
        customAvatar={avatar}

        size={avatarSize}
      />
      <span className={cn('font-neo-body text-neo-white', text)}>
        {label}
      </span>
    </div>
  );
}
