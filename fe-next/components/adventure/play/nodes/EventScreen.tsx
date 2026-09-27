'use client';

/**
 * `?` node. Card layout of the genre: illustration, in-character body text, and
 * choice buttons whose label already states the outcome (the locale copy folds
 * "[Study] Gain a relic" into the button, so nothing is a blind tap).
 *
 * After the pick, the real ledger is shown — computed from the run before and
 * after, so a gamble that rolled badly says exactly what it took. A reload
 * re-reads `taken` with no outcome, so the screen names the choice instead.
 */
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import DeltaChips, { useLineText } from './DeltaChips';
import NodeShell, { NodeButton } from './NodeShell';
import { eventArt, nodeScene } from './nodeArt';
import { eventChoiceHints, eventChoiceKeys, eventKey, runDelta, type EventHint } from './nodeText';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  choices: number;
  taken?: number;
  run: PublicRun;
  /** The run as it stood when this node was entered — the diff's left-hand side. */
  before: PublicRun;
  world: number;
  busy: boolean;
  onChoose: (index: number) => void;
  onLeave: () => void;
}

/**
 * What the button is about to do, read off the same table the server resolves
 * against. A gamble keeps its branches apart with an explicit "or" — a merged
 * chip row would promise the good half of a roll that can land on the bad one.
 */
function HintChips({ hint }: { hint: EventHint }) {
  const { t } = useLanguageSafe();
  const lineText = useLineText();
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {hint.risky && (
        <span className="inline-flex items-center gap-0.5 rounded-md border-2 border-black bg-neo-purple px-1 py-px text-[9px] font-black uppercase tracking-wide text-neo-cream">
          <Dices className="h-3 w-3 stroke-[2.5]" aria-hidden />{t('adventurePlay.node.hintRisk')}
        </span>
      )}
      {hint.outcomes.map((group, g) => (
        <span key={g} className="flex flex-wrap items-center gap-1">
          {g > 0 && <span className="px-0.5 text-[10px] font-black uppercase tracking-wide opacity-60">{t('adventurePlay.node.hintOr')}</span>}
          {group.map((line, i) => (
            <span key={`${line.key}-${i}`}
              className={cn('rounded-md border-2 border-black px-1.5 py-px text-[11px] font-bold leading-tight text-black',
                line.tone === 'bad' ? 'bg-neo-pink' : 'bg-neo-lime')}>
              {lineText(line)}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export default function EventScreen({ id, choices, taken, run, before, world, busy, onChoose, onLeave }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const [art, setArt] = useState(eventArt(id));
  const chosen = taken ?? picked;
  const resolved = taken != null;
  const keys = eventChoiceKeys(id, choices);
  const hints = eventChoiceHints(id);
  const lines = runDelta(before, run);
  // A reload lands on a node that is already resolved: the server sends `taken`
  // but the diff is empty, and "Nothing happens" would be a lie about a choice
  // that paid out before the page came back. Name the choice instead.
  const reloaded = taken != null && picked == null && lines.length === 1 && lines[0].key.endsWith('outNothing');
  const nothingToShow = lines.length === 1 && lines[0].key.endsWith('outNothing');

  const take = (index: number) => {
    if (chosen != null || busy) return;
    setPicked(index);
    sfx.playButtonClickSound?.();
    onChoose(index);
  };

  return (
    <NodeShell kind="event" world={world} title={t(eventKey(id, 'title'))}
      gold={run.gold} hp={run.hp} maxHp={run.maxHp} busy={busy}
      footer={<NodeButton testId="node-leave" onClick={() => {
        trackGrowthEvent('adventure_exit', { from: 'event' });
        onLeave();
      }} tone={resolved ? 'lime' : 'cream'} disabled={busy}>
        {resolved ? t('adventurePlay.node.continue') : t('adventurePlay.map.leave')}
      </NodeButton>}>

      {/* Centred, with the illustration capped: the backdrop is painted as a
          FRAME (signpost at the bottom, canopy at the top), so the slack has to
          stay split between the two bands instead of collapsing to one side. */}
      <div className="flex h-full flex-col justify-center gap-2.5 pb-2">
        <motion.div
          initial={reduce ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className={cn('relative overflow-hidden rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#000]',
            resolved ? 'h-20 shrink-0' : 'min-h-[8rem] max-h-[13rem] flex-1')}>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative event illustration */}
          <img src={art} alt="" aria-hidden draggable={false} onError={() => setArt(nodeScene('event', world))}
            className="h-full w-full object-cover" />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(9,14,34,0.9)_0%,transparent_60%)]" />
        </motion.div>

        <p className="rounded-2xl border-[3px] border-black bg-black/70 p-2.5 text-sm font-semibold leading-snug">
          {t(eventKey(id, 'body'))}
        </p>

        <div className="flex flex-col gap-2">
          {keys.map((key, i) => {
            const gone = chosen != null && chosen !== i;
            return (
              <AnimatePresence key={key}>
                {!gone && (
                  <motion.button
                    type="button"
                    data-testid={`event-choice-${i}`}
                    disabled={chosen != null || busy}
                    onClick={() => take(i)}
                    initial={reduce ? false : { y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { x: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 330, damping: 24, delay: reduce ? 0 : 0.06 * i }}
                    className={cn('w-full rounded-xl border-[3px] border-black bg-neo-cream px-3 py-2.5 text-start font-neo-display text-base font-bold text-black shadow-[4px_4px_0_#000] transition active:translate-y-0.5 active:shadow-none disabled:cursor-default',
                      chosen === i && 'bg-neo-lime ring-4 ring-neo-yellow')}
                  >
                    <span className="block leading-tight">{t(key)}</span>
                    {hints[i] && !resolved && <HintChips hint={hints[i]} />}
                  </motion.button>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        <AnimatePresence>
          {resolved && (
            <motion.div data-testid="event-outcome"
              initial={reduce ? false : { y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: reduce ? 0 : 0.12 }}
              className="rounded-2xl border-[3px] border-black bg-black/80 p-3 text-center">
              <p className="text-xs font-black uppercase tracking-wider opacity-70">
                {reloaded ? t('adventurePlay.node.alreadyTaken') : t('adventurePlay.node.outcomeTitle')}
              </p>
              {reloaded
                ? <p className="mt-1 font-neo-display text-base font-bold leading-snug">{t(keys[taken as number] ?? '')}</p>
                : nothingToShow
                  ? <p className="mt-1 font-neo-display text-lg font-bold">{t('adventurePlay.map.outNothing')}</p>
                  : <div className="mt-1.5"><DeltaChips lines={lines} testId="event-delta" /></div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeShell>
  );
}
