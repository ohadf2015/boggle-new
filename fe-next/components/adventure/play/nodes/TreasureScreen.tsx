'use client';

/**
 * Treasure node — a pick-ONE, not a reveal.
 *
 * The server offers the chest's prizes and grants nothing until the run answers
 * (`nodeResolve.treasureOffers`), so opening the lid is a real decision with a
 * real cost: the prizes you leave behind stay on screen, greyed and tagged
 * "Passed". Both answers are confirmed first — a mis-tap here is irreversible
 * — and the sealed-chest answer says out loud that it pays nothing.
 *
 * A run token minted before chests became a choice still carries its single
 * granted prize (`relic` / `gold`); that case renders the old one-prize card.
 */
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import type { TreasureOffer } from '@/lib/adventure/play/nodeResolve';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { CHEST_CLOSED_ART, CHEST_OPEN_ART, COIN_ART, RARITY_FRAME, relicArt } from '../run/art';
import NodeShell, { NodeButton } from './NodeShell';
import TreasureOffers, { offerName } from './TreasureOffers';
import { relicDescKey, relicNameKey } from './nodeText';
import { cn } from '@/lib/utils';

interface Props {
  offers?: TreasureOffer[];
  taken?: number;
  /** Legacy single-prize chest (pre-choice run token). */
  relic?: RelicId;
  gold?: number;
  run: PublicRun;
  world: number;
  busy: boolean;
  onPick: (index: number) => void;
  onLeave: () => void;
}

/** The lid, with its burst of rays once it is open. */
function Chest({ open, big, onOpen, label }: { open: boolean; big: boolean; onOpen: () => void; label: string }) {
  const reduce = useReducedMotion();
  return (
    <button type="button" data-testid="treasure-chest" onClick={onOpen} disabled={open} aria-label={label}
      className={cn('relative mx-auto grid shrink-0 place-items-center disabled:cursor-default', big ? 'h-44 w-44' : 'h-24 w-24')}>
      {open && (
        <>
          <motion.span aria-hidden className="absolute inset-[-40%] rounded-full"
            style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,230,120,0.5) 0deg 10deg, transparent 10deg 30deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 68%)' }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, rotate: 360 }}
            transition={reduce ? { duration: 0 } : { opacity: { duration: 0.3 }, scale: { duration: 0.4 }, rotate: { duration: 16, repeat: Infinity, ease: 'linear' } }} />
          <motion.span aria-hidden className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(255,244,180,0.95)_0%,rgba(255,214,0,0.35)_45%,transparent_70%)]"
            initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} />
        </>
      )}
      <motion.img key={open ? 'open' : 'closed'} src={open ? CHEST_OPEN_ART : CHEST_CLOSED_ART} alt="" draggable={false}
        className="relative h-full w-full object-contain drop-shadow-[5px_5px_0_#000]"
        initial={open && !reduce ? { scale: 0.7, y: 10 } : false}
        animate={open || reduce ? { scale: 1, y: 0 } : { rotate: [0, -6, 6, -4, 4, 0], y: [0, -5, 0] }}
        transition={open ? { type: 'spring', stiffness: 500, damping: 14 } : { duration: 0.9, repeat: Infinity, repeatDelay: 0.8 }} />
    </button>
  );
}

/** The one-prize card a pre-choice run token still resolves to. */
function LegacyPrize({ relic, gold }: { relic?: RelicId; gold?: number }) {
  const { t } = useLanguageSafe();
  const frame = RARITY_FRAME[relic ? RELICS[relic].rarity : 'epic'];
  return (
    <div data-testid="treasure-prize" className="mx-auto w-full max-w-xs rounded-2xl border-[3px] border-black bg-[#121d42] p-3 text-center shadow-[5px_5px_0_#000]">
      {relic && (
        <span className={cn('mx-auto -mt-6 block w-fit rounded-lg border-[3px] border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#000]', frame.bg)}>
          {t(`adventurePlay.loot.rarity.${RELICS[relic].rarity}`)}
        </span>
      )}
      <span className="relative mx-auto mt-2 grid h-24 w-24 place-items-center">
        <span aria-hidden className="absolute inset-2 rounded-full opacity-70 blur-lg" style={{ background: frame.glow }} />
        {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
        <img src={relic ? relicArt(relic) : COIN_ART} alt="" draggable={false} className="relative h-full w-full object-contain" />
      </span>
      <p className="mt-1.5 font-neo-display text-xl font-bold">
        <bdi>{relic ? t(relicNameKey(relic)) : t('adventurePlay.map.treasureGold', { amount: gold ?? 0 })}</bdi>
      </p>
      {relic && <p className="mt-1 text-sm font-semibold leading-snug opacity-90">{t(relicDescKey(relic))}</p>}
      <p className="mt-2 rounded-lg border-2 border-black bg-neo-lime px-2 py-0.5 font-neo-display text-sm font-bold text-black">
        {t('adventurePlay.node.relicAdded')}
      </p>
    </div>
  );
}

export default function TreasureScreen({ offers, taken, relic, gold, run, world, busy, onPick, onLeave }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const reduce = useReducedMotion();
  const legacy = relic != null || gold != null;
  const list = offers ?? [];
  const answered = taken != null;
  const [lifted, setLifted] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  // A legacy chest keeps its lid theatre: its prize is already banked, so the
  // screen must still name it rather than skip straight to a Continue button.
  const open = lifted || answered;
  const skipIndex = list.length;

  const openIt = () => {
    if (open) return;
    setLifted(true);
    sfx.playChestOpenSound?.();
  };
  const ask = (index: number) => {
    setConfirm(index);
    sfx.playMenuOpenSound?.();
  };
  const take = (index: number) => {
    setConfirm(null);
    if (index === skipIndex) sfx.playMenuCloseSound?.();
    else {
      sfx.playCoinCollectSound?.();
      sfx.playPowerUpSound?.();
    }
    onPick(index);
  };

  const pending = confirm != null ? (confirm === skipIndex ? null : list[confirm]) : undefined;
  const skipping = confirm === skipIndex;
  const name = pending ? offerName(pending) : null;
  const frame = pending ? RARITY_FRAME[pending.kind === 'relic' ? RELICS[pending.id].rarity : 'epic'] : null;

  const won = taken != null ? list[taken] : undefined;
  const ledger: { key: string; params?: Record<string, string | number>; tone: 'good' | 'bad' } | null =
    legacy ? { key: 'adventurePlay.node.relicAdded', tone: 'good' }
      : won?.kind === 'relic' ? { key: 'adventurePlay.node.relicAdded', tone: 'good' }
        : won?.kind === 'gold' ? { key: 'adventurePlay.map.outGold', params: { amount: `\u200e+${won.amount}` }, tone: 'good' }
          : taken === skipIndex ? { key: 'adventurePlay.node.chestSkipDesc', tone: 'bad' }
            : null;

  const subtitle = !open ? t('adventurePlay.loot.tapToOpen')
    : taken === skipIndex ? t('adventurePlay.node.chestSkipped')
      : answered || legacy ? undefined : t('adventurePlay.node.chestSub');

  return (
    <NodeShell kind="treasure" world={world} title={t('adventurePlay.map.treasureTitle')} subtitle={subtitle}
      gold={run.gold} hp={run.hp} maxHp={run.maxHp} busy={busy}
      footer={
        !open ? (
          <NodeButton testId="node-open" onClick={openIt} tone="yellow" disabled={busy}>{t('adventurePlay.node.openChest')}</NodeButton>
        ) : answered || legacy ? (
          <div className="space-y-2">
            {/* What the chest actually paid, read off the offer the run took —
                not off a diff, so a reload states it just as plainly. */}
            {ledger && (
              <motion.p data-testid="treasure-ledger"
                initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className={cn('rounded-xl border-[3px] border-black px-3 py-1.5 text-center font-neo-display text-sm font-bold text-black shadow-[3px_3px_0_#000]',
                  ledger.tone === 'good' ? 'bg-neo-lime' : 'bg-neo-cream')}>
                <bdi>{t(ledger.key, ledger.params)}</bdi>
              </motion.p>
            )}
            <NodeButton testId="node-leave" onClick={onLeave} tone="lime" disabled={busy}>{t('adventurePlay.node.continue')}</NodeButton>
          </div>
        ) : (
          <NodeButton testId="treasure-skip" onClick={() => ask(skipIndex)} tone="cream" disabled={busy}>
            {t('adventurePlay.node.chestSkip')}
          </NodeButton>
        )
      }>

      <div className={cn('flex min-h-full flex-col justify-center', open ? 'gap-2' : 'gap-3')}>
        <Chest open={open} big={!open} onOpen={openIt} label={open ? t('adventurePlay.map.treasureTitle') : t('adventurePlay.loot.tapToOpen')} />
        {open && (legacy
          ? <LegacyPrize relic={relic} gold={gold} />
          : <TreasureOffers offers={list} taken={taken} busy={busy} onPick={ask} />)}
      </div>

      {/* Both answers are confirmed: the pick costs the rest of the chest, and
          the sealed-chest answer pays nothing at all. Neither is a mis-tap. */}
      <AnimatePresence>
        {/* CSS entrance, not a framer-motion hidden initial: a backdrop whose
            opacity is driven by the rAF loop paints black when that loop is
            starved — popupRevealGuard enforces this. */}
        {confirm != null && (
          <div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-5 animate-in fade-in duration-200"
            onClick={() => setConfirm(null)}>
            <motion.div role="dialog" aria-modal="true" data-testid="treasure-confirm"
              initial={reduce ? false : { scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={reduce ? undefined : { scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl border-[3px] border-black bg-[#121d42] p-4 text-center shadow-[6px_6px_0_#000]">
              {pending && name && frame ? (
                <>
                  <span className="relative mx-auto grid h-24 w-24 place-items-center">
                    <span aria-hidden className="absolute inset-2 rounded-full opacity-70 blur-lg" style={{ background: frame.glow }} />
                    {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                    <img src={pending.kind === 'relic' ? relicArt(pending.id) : COIN_ART} alt="" draggable={false} className="relative h-full w-full object-contain" />
                  </span>
                  <span className={cn('mx-auto -mt-2 block w-fit rounded-lg border-[3px] border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#000]', frame.bg)}>
                    {pending.kind === 'relic' ? t(`adventurePlay.loot.rarity.${RELICS[pending.id].rarity}`) : t('adventurePlay.loot.kindGold')}
                  </span>
                  <p className="mt-1 font-neo-display text-xl font-bold"><bdi>{t(name.key, name.params)}</bdi></p>
                  <p className="mt-1 text-sm font-semibold leading-snug opacity-90">
                    {pending.kind === 'relic' ? t(relicDescKey(pending.id)) : t('adventurePlay.loot.goldDesc')}
                  </p>
                  <p className="mt-2 rounded-lg border-2 border-black bg-neo-pink px-2 py-0.5 font-neo-display text-sm font-bold text-black">
                    {t('adventurePlay.node.chestGiveUp', { count: list.length - 1 })}
                  </p>
                </>
              ) : (
                <>
                  <span className="mx-auto grid h-24 w-24 place-items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                    <img src={CHEST_CLOSED_ART} alt="" draggable={false} className="h-full w-full object-contain opacity-80" />
                  </span>
                  <p className="mt-1 font-neo-display text-xl font-bold">{t('adventurePlay.node.chestSkip')}</p>
                  <p className="mt-2 rounded-lg border-2 border-black bg-neo-pink px-2 py-0.5 font-neo-display text-sm font-bold text-black">
                    {t('adventurePlay.node.chestSkipDesc')}
                  </p>
                </>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border-[3px] border-black bg-neo-cream px-2 py-2 font-neo-display font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
                  <X className="mx-auto h-5 w-5" aria-hidden />
                  <span className="sr-only">{t('adventurePlay.node.cancel')}</span>
                </button>
                <button type="button" data-testid="treasure-confirm-take" onClick={() => take(confirm)} disabled={busy}
                  className={cn('flex-[2] rounded-xl border-[3px] border-black px-2 py-2 font-neo-display text-lg font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none disabled:opacity-50',
                    skipping ? 'bg-neo-cream' : 'bg-neo-lime')}>
                  {skipping ? t('adventurePlay.node.chestSkip') : t('adventurePlay.loot.take')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NodeShell>
  );
}
