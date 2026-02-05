/**
 * GameModeIcon Component
 *
 * Custom illustrated icons for game modes matching the character art style.
 * Uses SVG illustrations instead of Lucide icons for a premium game feel.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

type IconSize = 'sm' | 'md' | 'lg' | 'xl';
type GameMode = 'multiplayer' | 'singleplayer' | 'adventure' | 'daily' | 'tournament';

export interface GameModeIconProps {
  mode: GameMode;
  size?: IconSize;
  className?: string;
  animated?: boolean;
  /**
   * Optional badge overlay (e.g., "LIVE", "NEW")
   */
  badge?: string;
}

const SIZE_MAP: Record<IconSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

// Multiplayer icon - Multiple character avatars with speech bubbles
const MultiplayerIcon = memo(function MultiplayerIcon({
  size,
  animated,
}: {
  size: number;
  animated: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#FF1493" stroke="#1a1a2e" strokeWidth="3" />

      {/* Character 1 (left) */}
      <motion.g
        animate={animated ? { y: [0, -2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      >
        <circle cx="20" cy="38" r="10" fill="#FFE135" stroke="#1a1a2e" strokeWidth="2" />
        <circle cx="17" cy="36" r="2" fill="#1a1a2e" />
        <circle cx="23" cy="36" r="2" fill="#1a1a2e" />
        <path d="M16 42 Q20 46 24 42" stroke="#1a1a2e" strokeWidth="2" fill="none" />
      </motion.g>

      {/* Character 2 (right) */}
      <motion.g
        animate={animated ? { y: [0, -2, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        <circle cx="44" cy="38" r="10" fill="#00FFFF" stroke="#1a1a2e" strokeWidth="2" />
        <circle cx="41" cy="36" r="2" fill="#1a1a2e" />
        <circle cx="47" cy="36" r="2" fill="#1a1a2e" />
        <path d="M40 42 Q44 46 48 42" stroke="#1a1a2e" strokeWidth="2" fill="none" />
      </motion.g>

      {/* Speech bubbles */}
      <motion.g
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      >
        <rect x="8" y="12" width="20" height="14" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2" />
        <text x="18" y="22" textAnchor="middle" fontSize="10" fill="#1a1a2e" fontWeight="bold">
          ABC
        </text>
      </motion.g>

      <motion.g
        animate={animated ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
      >
        <rect x="36" y="8" width="20" height="14" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2" />
        <text x="46" y="18" textAnchor="middle" fontSize="10" fill="#1a1a2e" fontWeight="bold">
          XYZ
        </text>
      </motion.g>
    </svg>
  );
});

// Single player icon - Character reading a book
const SinglePlayerIcon = memo(function SinglePlayerIcon({
  size,
  animated,
}: {
  size: number;
  animated: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#00FFFF" stroke="#1a1a2e" strokeWidth="3" />

      {/* Character head */}
      <motion.g
        animate={animated ? { rotate: [-2, 2, -2] } : {}}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: '32px 28px' }}
      >
        <circle cx="32" cy="28" r="14" fill="#FFE135" stroke="#1a1a2e" strokeWidth="2" />
        {/* Eyes with glasses */}
        <circle cx="27" cy="26" r="5" fill="white" stroke="#1a1a2e" strokeWidth="2" />
        <circle cx="37" cy="26" r="5" fill="white" stroke="#1a1a2e" strokeWidth="2" />
        <circle cx="27" cy="26" r="2" fill="#1a1a2e" />
        <circle cx="37" cy="26" r="2" fill="#1a1a2e" />
        {/* Glasses bridge */}
        <line x1="32" y1="26" x2="32" y2="26" stroke="#1a1a2e" strokeWidth="2" />
        {/* Smile */}
        <path d="M28 34 Q32 37 36 34" stroke="#1a1a2e" strokeWidth="2" fill="none" />
      </motion.g>

      {/* Book */}
      <motion.g
        animate={animated ? { y: [0, -1, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <rect x="16" y="40" width="32" height="18" rx="2" fill="#8B4513" stroke="#1a1a2e" strokeWidth="2" />
        <rect x="18" y="42" width="28" height="14" rx="1" fill="#F5DEB3" />
        {/* Book pages/lines */}
        <line x1="22" y1="46" x2="42" y2="46" stroke="#8B4513" strokeWidth="1" />
        <line x1="22" y1="50" x2="38" y2="50" stroke="#8B4513" strokeWidth="1" />
        <line x1="22" y1="54" x2="40" y2="54" stroke="#8B4513" strokeWidth="1" />
        {/* Letters floating from book */}
        <text x="24" y="50" fontSize="6" fill="#1a1a2e" fontWeight="bold">
          W
        </text>
      </motion.g>

      {/* Floating letters */}
      {animated && (
        <>
          <motion.text
            x="12"
            y="20"
            fontSize="8"
            fill="#FFE135"
            fontWeight="bold"
            animate={{ y: [0, -5, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            A
          </motion.text>
          <motion.text
            x="48"
            y="16"
            fontSize="8"
            fill="#32CD32"
            fontWeight="bold"
            animate={{ y: [0, -5, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            B
          </motion.text>
        </>
      )}
    </svg>
  );
});

// Adventure icon - Map with treasure marker
const AdventureIcon = memo(function AdventureIcon({
  size,
  animated,
}: {
  size: number;
  animated: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#32CD32" stroke="#1a1a2e" strokeWidth="3" />

      {/* Map scroll */}
      <rect x="12" y="16" width="40" height="32" rx="4" fill="#F5DEB3" stroke="#1a1a2e" strokeWidth="2" />

      {/* Map texture - grid lines */}
      <line x1="16" y1="24" x2="48" y2="24" stroke="#D2B48C" strokeWidth="1" />
      <line x1="16" y1="32" x2="48" y2="32" stroke="#D2B48C" strokeWidth="1" />
      <line x1="16" y1="40" x2="48" y2="40" stroke="#D2B48C" strokeWidth="1" />
      <line x1="24" y1="20" x2="24" y2="44" stroke="#D2B48C" strokeWidth="1" />
      <line x1="32" y1="20" x2="32" y2="44" stroke="#D2B48C" strokeWidth="1" />
      <line x1="40" y1="20" x2="40" y2="44" stroke="#D2B48C" strokeWidth="1" />

      {/* Path on map */}
      <motion.path
        d="M20 40 L28 36 L32 28 L40 24"
        stroke="#FF6B35"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={animated ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 2, repeat: animated ? Infinity : 0, repeatDelay: 1 }}
      />

      {/* Start marker */}
      <circle cx="20" cy="40" r="3" fill="#32CD32" stroke="#1a1a2e" strokeWidth="1.5" />

      {/* Treasure marker with X */}
      <motion.g
        animate={animated ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <circle cx="40" cy="24" r="5" fill="#FFD700" stroke="#1a1a2e" strokeWidth="2" />
        <text x="40" y="27" textAnchor="middle" fontSize="6" fill="#1a1a2e" fontWeight="bold">
          X
        </text>
      </motion.g>

      {/* Scroll edges */}
      <rect x="10" y="18" width="4" height="28" rx="2" fill="#8B4513" stroke="#1a1a2e" strokeWidth="1" />
      <rect x="50" y="18" width="4" height="28" rx="2" fill="#8B4513" stroke="#1a1a2e" strokeWidth="1" />
    </svg>
  );
});

// Daily challenge icon - Calendar with sparkle
const DailyIcon = memo(function DailyIcon({
  size,
  animated,
}: {
  size: number;
  animated: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#FF6B35" stroke="#1a1a2e" strokeWidth="3" />

      {/* Calendar body */}
      <rect x="14" y="20" width="36" height="30" rx="4" fill="white" stroke="#1a1a2e" strokeWidth="2" />

      {/* Calendar header */}
      <rect x="14" y="20" width="36" height="10" rx="4" fill="#FFE135" stroke="#1a1a2e" strokeWidth="2" />
      <rect x="14" y="26" width="36" height="4" fill="#FFE135" />

      {/* Calendar rings */}
      <circle cx="22" cy="18" r="3" fill="#8B4513" stroke="#1a1a2e" strokeWidth="1.5" />
      <circle cx="42" cy="18" r="3" fill="#8B4513" stroke="#1a1a2e" strokeWidth="1.5" />

      {/* Checkmark */}
      <motion.path
        d="M24 38 L30 44 L42 32"
        stroke="#32CD32"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={animated ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 1, repeat: animated ? Infinity : 0, repeatDelay: 1 }}
      />

      {/* Sparkle decoration */}
      {animated && (
        <motion.g
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <path
            d="M52 12 L54 18 L60 20 L54 22 L52 28 L50 22 L44 20 L50 18 Z"
            fill="#FFD700"
            stroke="#1a1a2e"
            strokeWidth="1"
          />
        </motion.g>
      )}
    </svg>
  );
});

// Tournament icon - Trophy with stars
const TournamentIcon = memo(function TournamentIcon({
  size,
  animated,
}: {
  size: number;
  animated: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#FFD700" stroke="#1a1a2e" strokeWidth="3" />

      {/* Trophy cup */}
      <motion.g
        animate={animated ? { y: [0, -3, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Cup body */}
        <path
          d="M20 16 Q20 36 32 40 Q44 36 44 16 Z"
          fill="#FF6B35"
          stroke="#1a1a2e"
          strokeWidth="2"
        />
        {/* Cup handles */}
        <path d="M20 20 Q12 20 12 28 Q12 36 20 34" fill="none" stroke="#1a1a2e" strokeWidth="2" />
        <path d="M44 20 Q52 20 52 28 Q52 36 44 34" fill="none" stroke="#1a1a2e" strokeWidth="2" />
        {/* Cup base */}
        <rect x="26" y="40" width="12" height="4" fill="#8B4513" stroke="#1a1a2e" strokeWidth="2" />
        <rect x="22" y="44" width="20" height="4" fill="#8B4513" stroke="#1a1a2e" strokeWidth="2" />
      </motion.g>

      {/* Stars */}
      <motion.g
        animate={animated ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <path
          d="M16 14 L18 20 L24 22 L18 24 L16 30 L14 24 L8 22 L14 20 Z"
          fill="white"
          stroke="#1a1a2e"
          strokeWidth="1"
        />
      </motion.g>
      <motion.g
        animate={animated ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      >
        <path
          d="M48 14 L50 20 L56 22 L50 24 L48 30 L46 24 L40 22 L46 20 Z"
          fill="white"
          stroke="#1a1a2e"
          strokeWidth="1"
        />
      </motion.g>
    </svg>
  );
});

export const GameModeIcon = memo(function GameModeIcon({
  mode,
  size = 'md',
  className,
  animated = true,
  badge,
}: GameModeIconProps) {
  const { prefersReducedMotion } = useDevicePerformance();
  const shouldAnimate = animated && !prefersReducedMotion;
  const pixelSize = SIZE_MAP[size];

  const IconComponent = {
    multiplayer: MultiplayerIcon,
    singleplayer: SinglePlayerIcon,
    adventure: AdventureIcon,
    daily: DailyIcon,
    tournament: TournamentIcon,
  }[mode];

  return (
    <div className={cn('relative inline-block', className)}>
      <IconComponent size={pixelSize} animated={shouldAnimate} />
      {badge && (
        <div className="absolute -top-1 -right-1 bg-neo-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-xs">
          {badge}
        </div>
      )}
    </div>
  );
});

export default GameModeIcon;
