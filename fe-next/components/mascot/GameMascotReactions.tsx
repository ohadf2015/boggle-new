'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastMascotHud } from '@/components/blast/legacy/BlastMascotHud';
import { useBlastMascot } from '@/lib/blast/useBlastMascot';
import { useMascotEnabled } from '@/lib/blast/useMascotEnabled';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { comboTier, escalationMotion } from '@/lib/blast/mascotState';
import { createVoiceHistory, pickVoice, SIGNATURE_CRY, type MascotVoice } from '@/lib/mascot/voice';
import type { GagBeat, LegendaryGag } from '@/lib/mascot/legendary';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { MascotEdgeStage } from './MascotEdgeStage';
import { MascotIdlePeek } from './MascotIdlePeek';
import { MascotLegendaryGag } from './MascotLegendaryGag';
import { useMascotIdle } from './useMascotIdle';
import { useLegendaryGag } from './useLegendaryGag';

export type MascotPersonality = 'full' | 'quiet';

interface GameMascotReactionsProps {
  mode: string;
  comboLevel: number;
  /** 'quiet' (multiplayer, classrooms): reactions only, no voice, idle or gags. */
  personality?: MascotPersonality;
  seed?: number;
  legendaryChance?: number;
}

const COMBO_BREAK_MIN = 3;

export function GameMascotReactions({
  mode,
  comboLevel,
  personality = 'quiet',
  seed,
  legendaryChance,
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
    (voice: MascotVoice) => playSound(voice.sound, { rate: voice.rate, requiresGameActive: false }),
    [playSound],
  );

  const prevCombo = useRef(comboLevel);
  useEffect(() => {
    const prev = prevCombo.current;
    if (comboLevel > prev) emitMascotEvent({ kind: 'combo-milestone', level: comboLevel });
    else if (comboLevel === 0 && prev >= COMBO_BREAK_MIN) emitMascotEvent({ kind: 'combo-break', fromLevel: prev });
    prevCombo.current = comboLevel;
  }, [comboLevel]);

  const show = mascot.visible && allowed;
  useEffect(() => {
    if (show) trackGrowthEvent('mascot_reaction_shown', { state: mascot.state, mode });
  }, [show, mascot.state, mode]);

  const voiceHistory = useRef(createVoiceHistory());
  const lastVoicedAt = useRef(0);
  useEffect(() => {
    if (!show || !full || mascot.transitionAt === lastVoicedAt.current) return;
    lastVoicedAt.current = mascot.transitionAt;
    const { voice, history } = pickVoice(mascot.state, voiceHistory.current, Math.random);
    voiceHistory.current = history;
    if (voice) say(voice);
  }, [show, full, mascot.state, mascot.transitionAt, say]);

  const onGag = useCallback(
    (gag: LegendaryGag) => trackGrowthEvent('mascot_gag_shown', { gag: gag.id, mode }),
    [mode],
  );
  const legendary = useLegendaryGag({
    enabled: full && !isLowEnd && !reducedMotion,
    seed,
    chance: legendaryChance,
    onShow: onGag,
  });
  const onBeat = useCallback(
    (beat: GagBeat) => {
      if (beat.sound) say({ sound: beat.sound, rate: 1 });
      if (beat.cry) say(SIGNATURE_CRY);
    },
    [say],
  );

  const onDoze = useCallback(() => trackGrowthEvent('mascot_gag_shown', { gag: 'idle-doze', mode }), [mode]);
  const idle = useMascotIdle(full, onDoze);

  const tier = comboTier(comboLevel);
  const motion = escalationMotion(tier);
  const wiggle = tier > 0 && !reducedMotion;

  return (
    <>
      <AdaptiveAnimatePresence>
        {show && (
          <AdaptiveMotion.div
            key="game-mascot"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className="absolute top-[calc(env(safe-area-inset-top,0px)+2.75rem)] end-[4.25rem] sm:top-3 sm:end-3 z-50 pointer-events-none [&_*]:pointer-events-none"
          >
            <AdaptiveMotion.div
              data-testid="mascot-escalation"
              data-tier={tier}
              animate={
                wiggle
                  ? { rotate: [-motion.wiggleDeg, motion.wiggleDeg, -motion.wiggleDeg], scale: [1, motion.bounceScale, 1] }
                  : { rotate: 0, scale: 1 }
              }
              transition={wiggle ? { duration: motion.periodMs / 1000, repeat: Infinity } : { duration: 0.15 }}
            >
              <BlastMascotHud state={mascot.state} />
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
      {full && (legendary || idle !== 'awake') && (
        <MascotEdgeStage>
          {legendary ? (
            <MascotLegendaryGag gag={legendary} onBeat={onBeat} />
          ) : (
            idle !== 'awake' && <MascotIdlePeek phase={idle} />
          )}
        </MascotEdgeStage>
      )}
    </>
  );
}
