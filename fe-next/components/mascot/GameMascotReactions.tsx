'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastMascotHud } from '@/components/blast/legacy/BlastMascotHud';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { comboTier, escalationMotion } from '@/lib/blast/mascotState';
import { createVoiceHistory, pickVoice, SIGNATURE_CRY, type MascotVoice } from '@/lib/mascot/voice';
import { gagSoundVolume } from '@/lib/mascot/gagSounds';
import { createPersonalBestState, nextPersonalBestState } from '@/lib/mascot/personalBest';
import type { GagBeat, GagDef, GagVariant } from '@/lib/mascot/gagTypes';
import type { Language } from '@/shared/types/game';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { MascotEdgeStage } from './MascotEdgeStage';
import { MascotGagPlayer } from './MascotGagPlayer';
import { MascotTileStack } from './MascotTileStack';
import { useGagDirector } from './useGagDirector';

export type MascotPersonality = 'full' | 'quiet';

interface GameMascotReactionsProps {
  mode: string;
  comboLevel: number;
  /** 'quiet' (multiplayer, classrooms): reactions only, no voice, idle or gags. */
  personality?: MascotPersonality;
  language?: Language;
  remainingTime?: number | null;
  seed?: number;
  /** Live round score; with personalBest, fires the personal-best gag the moment it is passed. */
  score?: number;
  personalBest?: number | null;
  /** Replaces the default position classes, for hosts whose corner holds their own controls. */
  slotClassName?: string;
  /** Position and height of the gag strip; defaults to the top HUD row. */
  stageClassName?: string;
}

const COMBO_BREAK_MIN = 3;
const FINAL_SECONDS = 10;
const DEFAULT_SLOT = 'top-[calc(env(safe-area-inset-top,0px)+2.75rem)] end-[4.25rem] sm:top-3 sm:end-3';

export function GameMascotReactions({
  mode,
  comboLevel,
  personality = 'quiet',
  language,
  remainingTime = null,
  seed,
  score,
  personalBest = null,
  slotClassName = DEFAULT_SLOT,
  stageClassName,
}: GameMascotReactionsProps) {
  const mascot = useBlastMascot();
  const pref = useMascotEnabled();
  const [reducedEffects] = useReducedEffects();
  const reducedMotion = useReducedMotion();
  const { isLowEnd } = useDevicePerformance();
  const { playSound } = useSoundEffects();

  const allowed = pref.enabled && !reducedEffects;
  const full = personality === 'full' && allowed;

  const say = useCallback(
    (voice: MascotVoice) =>
      playSound(voice.sound, { rate: voice.rate, volume: gagSoundVolume(voice.sound), requiresGameActive: false }),
    [playSound],
  );

  const prevCombo = useRef(comboLevel);
  useEffect(() => {
    const prev = prevCombo.current;
    if (comboLevel > prev) emitMascotEvent({ kind: 'combo-milestone', level: comboLevel });
    else if (comboLevel === 0 && prev >= COMBO_BREAK_MIN) emitMascotEvent({ kind: 'combo-broken', fromLevel: prev });
    prevCombo.current = comboLevel;
  }, [comboLevel]);

  const finalCountdownSent = useRef(false);
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0 || remainingTime > FINAL_SECONDS || finalCountdownSent.current) return;
    finalCountdownSent.current = true;
    emitMascotEvent({ kind: 'timer-final-10s', secondsLeft: remainingTime });
  }, [remainingTime]);

  const personalBestState = useRef(createPersonalBestState());
  useEffect(() => {
    if (!full || score === undefined) return;
    const { state, fire } = nextPersonalBestState(personalBestState.current, score, personalBest);
    personalBestState.current = state;
    if (fire) emitMascotEvent({ kind: 'personal-best' });
  }, [full, score, personalBest]);

  const voiceHistory = useRef(createVoiceHistory());
  const onGag = useCallback(
    (gag: GagDef, variant: GagVariant) => trackGrowthEvent('mascot_gag_shown', { gag: gag.id, variant: variant.id, mode }),
    [mode],
  );
  const gag = useGagDirector({ enabled: full && !isLowEnd && !reducedMotion, language, seed, onShow: onGag });
  const onBeat = useCallback(
    (beat: GagBeat) => {
      if (beat.sound) say({ sound: beat.sound, rate: beat.soundRate ?? 1 });
      if (beat.cry) say(SIGNATURE_CRY);
      if (beat.sound || beat.cry) voiceHistory.current = { lastVoiced: true };
    },
    [say],
  );

  const show = mascot.visible && allowed && !gag;
  useEffect(() => {
    if (show) trackGrowthEvent('mascot_reaction_shown', { state: mascot.state, mode });
  }, [show, mascot.state, mode]);

  const lastVoicedAt = useRef(0);
  useEffect(() => {
    if (!show || !full || mascot.transitionAt === lastVoicedAt.current) return;
    lastVoicedAt.current = mascot.transitionAt;
    const { voice, history } = pickVoice(mascot.state, voiceHistory.current, Math.random);
    voiceHistory.current = history;
    if (voice) say(voice);
  }, [show, full, mascot.state, mascot.transitionAt, say]);

  const tier = comboTier(comboLevel);
  const motion = escalationMotion(tier);
  const wiggle = tier > 0 && !reducedMotion;

  return (
    <>
      <AdaptiveAnimatePresence>
        {show && (
          <AdaptiveMotion.div
            key="game-mascot"
            data-testid="game-mascot-slot"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className={`absolute ${slotClassName} z-50 pointer-events-none [&_*]:pointer-events-none`}
          >
            <AdaptiveMotion.div
              data-testid="mascot-escalation"
              className="relative"
              data-tier={tier}
              animate={
                wiggle
                  ? { rotate: [-motion.wiggleDeg, motion.wiggleDeg, -motion.wiggleDeg], scale: [1, motion.bounceScale, 1] }
                  : { rotate: 0, scale: 1 }
              }
              transition={wiggle ? { duration: motion.periodMs / 1000, repeat: Infinity } : { duration: 0.15 }}
            >
              {full && <MascotTileStack count={comboLevel} />}
              <BlastMascotHud state={mascot.state} />
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
      {gag && (
        <MascotEdgeStage className={stageClassName}>
          <MascotGagPlayer key={gag.key} playKey={gag.key} gagId={gag.gag.id} variant={gag.variant} onBeat={onBeat} />
        </MascotEdgeStage>
      )}
    </>
  );
}
