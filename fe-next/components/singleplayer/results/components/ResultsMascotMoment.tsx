'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { MascotCelebrationVideo, type MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';
import { Mascot } from '@/components/ui/Mascot';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { NearMiss } from '../nearMiss';
import { PHONE_MASCOT_CLIPS } from '../phoneMascotClips';

type Beat = 'celebrate' | 'faceplant';

interface ResultsMascotMomentProps {
  celebration: MascotCelebrationKind | null;
  nearMiss: NearMiss | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const VISIBLE_MS = 5000;
const FREEZE_MS = 800;
const BEAT_SECONDS = 1.7;
// wind-up → burst → freeze-frame hold → reaction
const BEAT_TIMES = [0, 0.18, 0.36, 0.62, 0.78, 1];

const BEATS: Record<Beat, { animate: Record<string, number[]>; pose: 'celebration' | 'oops'; voice: 'mascotCheer' | 'mascotAww'; rate: number }> = {
  celebrate: {
    animate: {
      scaleX: [1, 1.2, 0.82, 0.82, 1.12, 1],
      scaleY: [1, 0.78, 1.25, 1.25, 0.9, 1],
      y: [0, 8, -46, -46, 4, 0],
      rotate: [0, -4, 6, 6, -8, 0],
    },
    pose: 'celebration',
    voice: 'mascotCheer',
    rate: 1.3,
  },
  faceplant: {
    animate: {
      scaleX: [1, 0.95, 1.18, 1.18, 0.96, 1],
      scaleY: [1, 1.06, 0.72, 0.72, 1.08, 1],
      y: [0, -10, 26, 26, -6, 0],
      rotate: [0, -14, 78, 78, -10, 0],
    },
    pose: 'oops',
    voice: 'mascotAww',
    rate: 1.2,
  },
};

/** Edge-pinned mascot reaction to the result: a slapstick beat, never covering taps. */
export function ResultsMascotMoment({ celebration, nearMiss, t }: ResultsMascotMomentProps) {
  const beat: Beat | null = celebration ? 'celebrate' : nearMiss && nearMiss.kind !== 'newBest' ? 'faceplant' : null;
  const [reducedEffects] = useReducedEffects();
  const reducedMotion = useReducedMotion();
  const still = reducedEffects || reducedMotion;
  const { playSound } = useSoundEffects();
  const [visible, setVisible] = useState(true);
  // Decided after mount: the flash check reads matchMedia, which would mismatch SSR.
  const [phone, setPhone] = useState<boolean | null>(null);
  // One-shot WebPs hold their last frame; a fresh query per mount replays them.
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    setPhone(prefersStaticFullscreenOverlay());
    setPlayKey(Date.now());
  }, []);

  const phoneClip = beat && phone && !still ? PHONE_MASCOT_CLIPS[beat] : null;

  useEffect(() => {
    if (!beat || phone === null) return;
    const hide = window.setTimeout(() => setVisible(false), phoneClip?.durationMs ?? VISIBLE_MS);
    const voice = still
      ? undefined
      : window.setTimeout(() => {
          const cfg = BEATS[beat];
          void playSound(cfg.voice, { rate: cfg.rate, volume: 0.6, requiresGameActive: false });
        }, phoneClip?.freezeMs ?? FREEZE_MS);
    return () => {
      window.clearTimeout(hide);
      if (voice) window.clearTimeout(voice);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one beat per results screen
  }, [beat, phone]);

  if (!beat || !visible || phone === null) return null;
  const cfg = BEATS[beat];
  const playVideo = beat === 'celebrate' && celebration && !phone && !still;

  const body = phoneClip ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="sp-mascot-clip"
      src={`${phoneClip.src}?t=${playKey}`}
      alt=""
      width={phoneClip.width}
      height={phoneClip.height}
      className="h-28 w-auto object-contain"
    />
  ) : playVideo ? (
    <MascotCelebrationVideo kind={celebration} overlay={false} size="128px" autoDismissMs={0} title={null} />
  ) : (
    <Mascot variant={cfg.pose} size="xs" animated={false} alt={t('singlePlayer.nearMiss.mascotAlt')} />
  );

  return (
    <div
      data-testid="sp-mascot-moment"
      data-beat={beat}
      aria-hidden="true"
      className="pointer-events-none fixed end-3 z-40 bottom-[calc(var(--results-sticky-cta-h,96px)+0.75rem)]"
    >
      {still || phoneClip ? (
        body
      ) : (
        <m.div
          style={{ originY: 1 }}
          animate={cfg.animate}
          transition={{ duration: BEAT_SECONDS, times: BEAT_TIMES, ease: 'easeOut' }}
        >
          {body}
        </m.div>
      )}
    </div>
  );
}
