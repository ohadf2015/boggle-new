'use client';

import Avatar from '@/components/Avatar';
import { BurstLines, ConfettiPuff, QuickResultsRays, SparkleLoop } from '@/components/quick-play/QuickResultsFx';
import type { AvatarMood } from '@/lib/avatar/avatarMood';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface ResultsAvatar {
  userId: string;
  customAvatar?: CustomAvatarConfig | null;
}

interface ResultsAvatarStageProps {
  avatar: ResultsAvatar;
  mood: AvatarMood;
  accentHex: string;
  animate: boolean;
  cheering: boolean;
  confettiCount: number;
  /** Extra hop on the star-eyes beat. */
  hopping?: boolean;
  /** Shorter stage for screens that keep a card under it (daily). */
  compact?: boolean;
}

/** The player on turning light rays: the one calm moment above the fold. */
export function ResultsAvatarStage({
  avatar,
  mood,
  accentHex,
  animate,
  cheering,
  confettiCount,
  hopping = false,
  compact = false,
}: ResultsAvatarStageProps) {
  return (
    <div
      className={`relative flex w-full items-center justify-center ${compact ? 'h-[min(22dvh,180px)] lg:h-[200px]' : 'h-[min(34dvh,290px)] lg:h-[300px]'}`}
      data-testid="results-avatar-stage"
    >
      <QuickResultsRays color={accentHex} spinning={animate} />
      <ConfettiPuff count={cheering ? confettiCount : 0} enabled={animate} />
      <BurstLines enabled={animate && cheering} />
      {hopping && <BurstLines enabled delayMs={0} />}
      <SparkleLoop enabled={animate && cheering} />
      <div
        className={`relative z-10 ${animate ? 'animate-[qp-avatar-pop_0.7s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}`}
        data-testid="quick-hero-avatar"
      >
        <div className={animate ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
          <div
            data-testid={hopping ? 'quick-hero-hop' : undefined}
            className={hopping ? 'animate-[qp-avatar-hop_0.62s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}
          >
            <div className={compact ? '-m-12 scale-[0.55] lg:-m-10 lg:scale-[0.65]' : '-m-5 scale-[0.8] lg:m-0 lg:scale-100'}>
              <Avatar userId={avatar.userId} customAvatar={avatar.customAvatar ?? undefined} pixelSize={200} mood={mood} />
            </div>
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`absolute -bottom-3 left-1/2 -z-10 h-3.5 w-28 -translate-x-1/2 rounded-[50%] bg-black/45 ${
            animate ? 'animate-[qp-shadow-bob_2.8s_ease-in-out_0.9s_infinite]' : ''
          }`}
        />
      </div>
    </div>
  );
}
