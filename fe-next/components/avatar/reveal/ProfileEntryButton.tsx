'use client';

import Link from 'next/link';
import AvatarLite, { type AvatarLiteConfig } from '@/components/AvatarLite';

export interface ProfileEntryButtonProps {
  href: string;
  label: string;
  avatarConfig: AvatarLiteConfig | null;
  userId?: string;
  level: number | null;
  /** An unlock was revealed this session and the profile wasn't opened yet. */
  hasNew: boolean;
  onClick?: () => void;
}

/**
 * The player's face in the header, one tap from their profile. Presentational
 * (plain props) so the /avatar-test lab can capture it without auth. Uses
 * AvatarLite only — header is first-paint, the full renderer never loads here.
 * 36px under 380px wide: the guest header row measured only 42px free at 360.
 */
export default function ProfileEntryButton({ href, label, avatarConfig, userId, level, hasNew, onClick }: ProfileEntryButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid="header-profile-entry"
      aria-label={label}
      className="relative shrink-0 flex items-center justify-center w-9 h-9 min-[380px]:w-11 min-[380px]:h-11 rounded-full hover:-translate-y-px active:translate-y-px transition-transform"
    >
      <span className="block rounded-full border-3 border-neo-black bg-neo-navy shadow-hard-sm">
        <AvatarLite customAvatar={avatarConfig} userId={userId} pixelSize={30} className="border-0 min-[380px]:!w-[34px] min-[380px]:!h-[34px]" />
      </span>
      {level != null && (
        <span
          data-testid="header-profile-level"
          className="absolute -bottom-0.5 -end-1 min-w-[18px] h-[16px] px-1 flex items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime text-neo-black text-[9px] font-black leading-none tabular-nums"
        >
          {level}
        </span>
      )}
      {hasNew && (
        <span
          data-testid="header-profile-new"
          aria-hidden="true"
          className="absolute top-0 -end-0.5 w-3 h-3 rounded-full border-2 border-neo-black bg-neo-pink motion-safe:animate-pulse"
        />
      )}
    </Link>
  );
}
