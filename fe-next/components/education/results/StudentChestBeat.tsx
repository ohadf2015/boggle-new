'use client';

import { useEffect, useRef, useState } from 'react';
import ChestStage from '@/components/education/economy/ChestStage';
import { useChestChips } from '@/components/education/economy/chestChips';
import { useStudentAvatar } from '@/components/education/economy/useStudentAvatar';
import { chestHeadlineKey, nextChestPhase, type ChestPhase } from '@/components/education/economy/chestPhase';
import type { ClassroomChestReveal } from '@/shared/constants/classroomEconomy';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { hapticGameWin } from '@/utils/haptics';
import { beatReached, type RevealBeat } from './studentReveal';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const SHAKE_MS = 600;
const BURST_MS = 700;

interface StudentChestBeatProps {
  reveal: ClassroomChestReveal;
  beat: RevealBeat;
  reduceMotion: boolean;
  t: Translate;
}

function Payout({ reveal, t }: { reveal: ClassroomChestReveal; t: Translate }) {
  const chips = useChestChips(reveal, useStudentAvatar());
  return (
    <div data-testid="edu-student-chest-payout" className="flex flex-col items-center gap-1.5 motion-safe:animate-[edu-live-pop_280ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
      <p className="font-neo-display text-2xl font-black uppercase leading-none text-neo-yellow">{t(chestHeadlineKey(reveal.rarity))}</p>
      <ul aria-label={t('economy.chest.chip.label')} className="flex flex-wrap justify-center gap-1.5">
        {chips.map((chip) => (
          <li key={chip.id} className="inline-flex items-baseline gap-1 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
            <bdi>{chip.value}</bdi>
            {chip.id !== 'item' && <span className="font-neo-body text-xs font-bold">{chip.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The round's chest inside the reveal: sealed while the rank and verdict land, then it shakes, bursts and pays out in place. */
export function StudentChestBeat({ reveal, beat, reduceMotion, t }: StudentChestBeatProps) {
  const { playChestOpenSound } = useSoundEffects();
  const [phase, setPhase] = useState<ChestPhase>(reduceMotion ? 'revealed' : 'sealed');
  const cued = useRef(false);
  const due = beatReached(beat, 'chest');

  useEffect(() => {
    if (reduceMotion) setPhase('revealed');
    else if (due) setPhase((p) => (p === 'sealed' ? 'shaking' : p));
  }, [due, reduceMotion]);

  useEffect(() => {
    if (phase !== 'shaking' && phase !== 'bursting') return undefined;
    const id = setTimeout(() => setPhase(nextChestPhase(phase, reduceMotion)), phase === 'shaking' ? SHAKE_MS : BURST_MS);
    return () => clearTimeout(id);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (cued.current || reduceMotion || (phase !== 'bursting' && phase !== 'revealed')) return;
    cued.current = true;
    playChestOpenSound?.();
    hapticGameWin();
  }, [phase, reduceMotion, playChestOpenSound]);

  return (
    <div
      data-testid="edu-student-chest"
      data-phase={phase}
      className="relative flex flex-col items-center gap-1 overflow-hidden rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy px-2 pb-2.5 pt-2 text-neo-cream shadow-hard"
    >
      {reveal.underdog && (
        <p data-testid="chest-comeback" className="relative z-10 rounded-full border-2 border-neo-black bg-neo-pink px-3 py-0.5 text-center font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
          {t('economy.reward.comeback')}
        </p>
      )}
      {reveal.bossWin && <p className="relative z-10 text-center font-neo-body text-xs font-bold">{t('classroomBoss.chestUpgraded')}</p>}
      <div className="relative h-36 w-full sm:h-44">
        <div className="absolute inset-x-0 top-1/2 flex h-[min(64vw,32vh,320px)] -translate-y-1/2 scale-[0.55] sm:scale-[0.62]">
          <ChestStage phase={phase} rarity={reveal.rarity} onTap={() => setPhase('revealed')} openLabel={t('economy.chest.open')} />
        </div>
      </div>
      {phase === 'revealed' ? (
        <Payout reveal={reveal} t={t} />
      ) : (
        <p className="relative font-neo-display text-lg font-black uppercase leading-none">{t('economy.reward.ready')}</p>
      )}
    </div>
  );
}

export default StudentChestBeat;
