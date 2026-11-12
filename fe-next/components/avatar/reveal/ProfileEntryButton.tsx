'use client';

import Link from 'next/link';
import AvatarLite, { type AvatarLiteConfig } from '@/components/AvatarLite';
import { LevelRing } from '@/components/progression/LevelRing';

export interface ProfileEntryButtonProps {
  href: string;
  label: string;
  avatarConfig: AvatarLiteConfig | null;
  userId?: string;
  level: number | null;
  /** Progress through the current level, 0-100; draws the XP ring when set. */
  pct?: number | null;
  /** An unlock was revealed this session and the profile wasn't opened yet. */
  hasNew: boolean;
  onClick?: () => void;
  /** profile.updated_at — busts AvatarLite PNG cache after save */
  revision?: string | null;
}

/**
 * The player's face in the header, one tap from their profile. Presentational
 * (plain props) so the /avatar-test lab can capture it without auth. Uses
 * AvatarLite only — header is first-paint, the full renderer never loads here.
 * 36px on phones (matches the compact header strip), 44px from sm up.
 */
export default function ProfileEntryButton({ href, label, avatarConfig, userId, level, pct = null, hasNew, onClick, revision }: ProfileEntryButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-testid="header-profile-entry"
      aria-label={label}
      className="relative shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full hover:-translate-y-px active:translate-y-px transition-transform"
    >
      {pct != null && level != null ? (
        <LevelRing pct={pct} level={level} thickness={2} trackLevel className="h-full w-full">
          <span className="block rounded-full border-2 sm:border-3 border-neo-black bg-neo-navy">
            <AvatarLite customAvatar={avatarConfig} userId={userId} revision={revision} pixelSize={28} className="border-0 sm:!w-[34px] sm:!h-[34px]" />
          </span>
        </LevelRing>
      ) : (
        <span className="block rounded-full border-2 sm:border-3 border-neo-black bg-neo-navy shadow-hard-sm">
          <AvatarLite customAvatar={avatarConfig} userId={userId} revision={revision} pixelSize={30} className="border-0 sm:!w-[34px] sm:!h-[34px]" />
        </span>
      )}
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
