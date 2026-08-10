'use client';

import { useMemo, memo } from 'react';
import nextDynamic from 'next/dynamic';
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { AvatarMode } from '@/components/avatar/AvatarRenderer';
import type { AvatarMood } from '@/lib/avatar/avatarMood';
import type { AvatarOverlay } from '@/lib/avatar/avatarOverlay';
import { cn } from '@/lib/utils';
import { NeoSkeletonAvatar } from '@/components/ui/skeleton';

/**
 * The renderer drags in `avatar/parts/*` — ~8300 lines of inline SVG that minify
 * to one 464kB module (91kB gz) webpack can't tree-shake, because parts are
 * looked up dynamically. Avatar is mounted from the global header, so a static
 * import put that on the shared chunk of every route, including pages that
 * render no avatar at all. Lazy keeps it off `/legal`, `/about` and the SEO
 * landings entirely, and off the critical path everywhere else.
 * Guarded by `components/__tests__/Avatar.bundleGraph.test.ts`.
 */
const AvatarRenderer = nextDynamic(() => import('@/components/avatar/AvatarRenderer'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neo-navy-light animate-pulse" />,
});

/** @deprecated No longer used — profile pictures removed in favor of custom avatars */
export const PROFILE_AVATAR_ID = '__profile_avatar__';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface SizeConfig {
  container: string;
  px: number;
}

interface AvatarProps {
  /** @deprecated Profile pictures removed — this prop is ignored */
  profilePictureUrl?: string | null;
  /** @deprecated Use customAvatar instead */
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig | null;
  /** Unique identifier for deterministic fallback avatar generation (e.g. user ID, username) */
  userId?: string;
  size?: AvatarSize;
  /** Pixel size override — fills container at exact px (bypasses SIZE_CONFIG). Used when caller already controls outer tile dimensions. */
  pixelSize?: number;
  className?: string;
  /** Show loading skeleton instead of avatar */
  isLoading?: boolean;
  /** Game-mode color frame: pink/cyan/purple/lime ring around avatar */
  mode?: AvatarMode;
  /** Equipped profile-frame cosmetic id (e.g. 'frame-gold'). 'frame-none'/null = no frame. */
  frame?: string | null;
  /**
   * Skip the per-tier CSS animation wrapper (idle breathing, glow-pulse drop-shadow,
   * sparkles, holographic filter loop, conic-gradient ring). Use in in-match
   * leaderboards/rosters where many avatars are visible at once — the continuous
   * `filter: drop-shadow` keyframes are paint-bound and stack into significant jank.
   */
  disableEffects?: boolean;
  /**
   * Transient reaction (correct/wrong/streak/win/…). Temporarily swaps the
   * eyes/eyebrows/mouth + plays a short animation. Undefined renders normally.
   * Drive with the `useAvatarMood` hook from game events.
   */
  mood?: AvatarMood;
  /** Loud reaction badge (alert/flame) for TV-legible high-signal moments. */
  overlay?: AvatarOverlay | null;
  /**
   * Show a static epic/legendary rarity gem baked into the SVG. Opt-in for
   * high-visibility surfaces (leaderboards, results-rivals, rosters, podium)
   * where premium reads as status — survives `disableEffects`. Default off.
   */
  tierMarker?: boolean;
}

/** Map a profile-frame cosmetic id to its avatar wrapper class. Returns null for no frame. */
function frameWrapperClass(frame: string | null | undefined): string | null {
  if (!frame || frame === 'frame-none') return null;
  return `avatar-${frame}`;
}

const SIZE_CONFIG: Record<AvatarSize, SizeConfig> = {
  sm: { container: 'w-6 h-6', px: 24 },
  md: { container: 'w-8 h-8', px: 32 },
  lg: { container: 'w-12 h-12', px: 48 },
  xl: { container: 'w-20 h-20', px: 80 },
  '2xl': { container: 'w-28 h-28', px: 112 }
};

/**
 * Unified Avatar Component
 * Fallback chain: customAvatar (SVG) > deterministic random custom avatar.
 */
const Avatar = memo<AvatarProps>((props) => {
  const {
    customAvatar,
    userId,
    size = 'md',
    pixelSize,
    className = '',
    isLoading,
    mode,
    frame,
    disableEffects,
    mood,
    overlay,
    tierMarker,
  } = props;
  // Back-compat: legacy callers still pass `avatarImage`. Read via prop access
  // so this component does not surface its own deprecation diagnostic.
  const legacySeed = (props as { avatarImage?: string }).avatarImage;
  const frameClass = frameWrapperClass(frame);
  const frameAttr = frameClass ? { 'data-frame': frame as string } : {};
  const baseConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const config: SizeConfig = pixelSize != null
    ? { container: '', px: pixelSize }
    : baseConfig;
  const containerSizeClass = pixelSize != null ? '' : config.container;
  const containerStyle = pixelSize != null
    ? { width: pixelSize, height: pixelSize }
    : undefined;

  // Pre-compute fallback avatar (must be before conditionals to satisfy hook rules)
  const fallbackSeed = userId || legacySeed || 'default-avatar';
  const fallbackConfig = useMemo(
    () => getSeededAvatarConfig(hashString(fallbackSeed)),
    [fallbackSeed]
  );

  // Show skeleton only when explicitly loading or when no identity is available.
  // The fallback config is deterministic from userId, so server and client
  // renders match without a hydration gate.
  const hasIdentity = !!(customAvatar || userId || legacySeed);
  const shouldLoad = isLoading === true || (isLoading === undefined && !hasIdentity);

  // 0. Loading state
  if (shouldLoad) {
    return (
      <NeoSkeletonAvatar size={config.px} className={className} />
    );
  }

  // 1. Custom SVG avatar (highest priority)
  if (customAvatar) {
    return (
      <div
        className={cn('relative rounded-full overflow-hidden shrink-0', containerSizeClass, className, frameClass)}
        style={containerStyle}
        data-testid="header-avatar"
        data-avatar-type="custom"
        data-mood={mood || undefined}
        {...frameAttr}
      >
        <AvatarRenderer config={customAvatar} size={config.px} circular className="w-full h-full" mode={mode} disableEffects={disableEffects} mood={mood} overlay={overlay} tierMarker={tierMarker} />
      </div>
    );
  }

  // 2. Fallback: deterministic random custom avatar
  return (
    <div
      className={cn('relative rounded-full overflow-hidden shrink-0', containerSizeClass, className, frameClass)}
      style={containerStyle}
      data-testid="header-avatar"
      data-avatar-type="generated"
      data-mood={mood || undefined}
      {...frameAttr}
    >
      <AvatarRenderer config={fallbackConfig} size={config.px} circular mode={mode} disableEffects={disableEffects} mood={mood} overlay={overlay} tierMarker={tierMarker} />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
