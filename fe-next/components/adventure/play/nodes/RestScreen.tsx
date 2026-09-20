'use client';

/**
 * Campfire node. Three one-shot choices (the server's 0 heal / 1 max HP /
 * 2 hint), each stating the exact number AND the before → after it produces,
 * so the trade is legible before it is taken.
 *
 * The chosen card grows and the others clear out; the run's real diff lands
 * under it. A reload after resting re-reads `taken` with no diff to show, so
 * the screen names the choice instead of printing an empty panel.
 */
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BedDouble, BookOpen, Dumbbell } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { hintCharges } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import DeltaChips, { useLineText } from './DeltaChips';
import NodeShell, { NodeButton } from './NodeShell';
import { restChoiceList, runDelta } from './nodeText';
import { cn } from '@/lib/utils';

interface Props {
  heal: number;
  taken?: number;
  run: PublicRun;
  /** The run as it stood when this node was entered — the diff's left-hand side. */
  before: PublicRun;
  world: number;
  busy: boolean;
  onChoose: (index: number) => void;
  onLeave: () => void;
}

const ICONS = [BedDouble, Dumbbell, BookOpen];
const TONES = ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan'];

export default function RestScreen({ heal, taken, run, before, world, busy, onChoose, onLeave }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const lineText = useLineText();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = taken ?? picked;

  // Every projection reads the run as it stood when the fire was REACHED, never
  // the run the choice produced. Taking [Train] lifts max HP, and re-deriving
  // from the new run made the spent card re-promise "6 → 7" — a trade that is
  // no longer on offer. `before` keeps it honest: "5 → 6", what it did.
  const hints = hintCharges(before.relics) + (before.bh ?? 0);
  const full = before.hp >= before.maxHp;
  // "3 → 5" for every choice: what this campfire turns the run into.
  const after = [
    { from: before.hp, to: Math.min(before.maxHp, before.hp + heal) },
    { from: before.maxHp, to: before.maxHp + 1 },
    { from: hints, to: hints + 1 },
  ];

  const take = (index: number) => {
    if (chosen != null || busy) return;
    setPicked(index);
    sfx.playPowerUpSound?.();
    onChoose(index);
  };

  const lines = runDelta(before, run);
  const resolved = taken != null;
  const nothingToShow = lines.length === 1 && lines[0].key.endsWith('outNothing');
  const choices = restChoiceList(heal);

  return (
    <NodeShell kind="rest" world={world} title={t('adventurePlay.map.restTitle')}
      subtitle={resolved ? t('adventurePlay.map.restTaken') : t('adventurePlay.node.restSub')}
      gold={run.gold} hp={run.hp} maxHp={run.maxHp} busy={busy}
      footer={<NodeButton testId="node-leave" onClick={onLeave} tone={resolved ? 'lime' : 'cream'} disabled={busy}>
        {resolved ? t('adventurePlay.node.continue') : t('adventurePlay.map.leave')}
      </NodeButton>}>

      {/* Centred on purpose: the node scenes are painted as FRAMES — fire at
          the bottom, canopy at the top, empty navy in the middle for the UI.
          Bottom-anchoring the cards buries the fire the screen is named after. */}
      <div className="flex h-full flex-col justify-center gap-2.5 pb-2">
        {choices.map((c, i) => {
          const Icon = ICONS[i];
          const gone = chosen != null && chosen !== c.index;
          const isChosen = chosen === c.index;
          // A heal at full hearts spends the fire for nothing. It stays legal
          // (the server allows it), but it must not sit there as the brightest
          // card on the screen pretending to be the obvious pick.
          const dead = c.index === 0 && full && !resolved;
          return (
            <AnimatePresence key={c.index}>
              {!gone && (
                <motion.button
                  type="button"
                  data-testid={`rest-choice-${c.index}`}
                  data-dead={dead || undefined}
                  disabled={chosen != null || busy}
                  onClick={() => take(c.index)}
                  initial={reduce ? false : { x: i % 2 ? 40 : -40, opacity: 0 }}
                  animate={{ x: 0, opacity: dead ? 0.6 : 1, scale: isChosen ? 1.04 : 1 }}
                  exit={reduce ? { opacity: 0 } : { x: i % 2 ? 80 : -80, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: reduce ? 0 : 0.06 * i }}
                  /* The dead card is REPAINTED, not just faded: framer-motion writes
                     `opacity` inline on this very element, so the `opacity-45` class
                     it used to rely on never landed and the wasted choice sat there
                     as the brightest card on the screen. */
                  className={cn('flex w-full items-center gap-3 rounded-2xl border-[3px] border-black p-3 text-start shadow-[5px_5px_0_#000] disabled:cursor-default',
                    dead ? 'bg-neo-navy-light text-neo-cream saturate-[0.4] shadow-[2px_2px_0_#000]' : `${TONES[i]} text-black`,
                    isChosen && 'ring-4 ring-neo-yellow')}
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-white/45">
                    <Icon className="h-8 w-8 stroke-[2.5]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-neo-display text-lg font-bold leading-tight">{t(c.key, c.params)}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-neo-display text-sm font-bold">
                      <bdi dir="ltr" className="rounded-md border-2 border-black bg-black/85 px-1.5 text-neo-cream tabular-nums">
                        {after[i].from} <span aria-hidden>→</span> {after[i].to}
                      </bdi>
                      <span className="text-xs font-extrabold uppercase tracking-wide opacity-70">{t(`adventurePlay.node.restUnit${c.index}`)}</span>
                    </span>
                    {dead && (
                      <span className="mt-0.5 block text-xs font-bold leading-tight">{t('adventurePlay.node.restFull')}</span>
                    )}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          );
        })}

        <AnimatePresence>
          {resolved && (
            <motion.div data-testid="rest-outcome"
              initial={reduce ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: reduce ? 0 : 0.15 }}
              className="rounded-2xl border-[3px] border-black bg-black/80 p-3 text-center">
              <p className="text-xs font-black uppercase tracking-wider opacity-70">{t('adventurePlay.node.outcomeTitle')}</p>
              {nothingToShow
                ? <p className="mt-1 font-neo-display text-lg font-bold">{t(choices[taken as number]?.key ?? '', choices[taken as number]?.params)}</p>
                : <div className="mt-1.5"><DeltaChips lines={lines} testId="rest-delta" /></div>}
              <p className="sr-only">{lines.map(lineText).join(', ')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeShell>
  );
}
