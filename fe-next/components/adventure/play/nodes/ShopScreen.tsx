'use client';

/**
 * Merchant node. The shelf is the server's (`shopStock`), so the indices the
 * buttons send are the ones `/api/adventure/node` validates. A row the server
 * would refuse — no gold, or already bought — is never tappable: the run's
 * error screen is one 400 away.
 *
 * Price is folded into the row (StS rule), the confirm sheet restates cost and
 * effect before it takes the gold, and the purchase's real ledger is shown
 * after, read from the run the server handed back.
 */
import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { RELICS, type Rarity } from '@/lib/adventure/play/relics';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { ShopItem } from '@/lib/adventure/play/shop';
import { COIN_ART, RARITY_FRAME, potionArt, relicArt } from '../run/art';
import DeltaChips from './DeltaChips';
import { nodeScene } from './nodeArt';
import NodeShell, { NodeButton } from './NodeShell';
import { isOnSale, runDelta, shopGreetingKey, shopItemText, shopRowState, type Line, type ShopRowState } from './nodeText';
import { cn } from '@/lib/utils';

interface Props {
  items: ShopItem[];
  bought: number[];
  run: PublicRun;
  world: number;
  busy: boolean;
  onBuy: (index: number) => void;
  onLeave: () => void;
}

const rarityOf = (item: ShopItem): Rarity => (item.type === 'relic' ? RELICS[item.id].rarity : 'common');

function ItemArt({ item, className }: { item: ShopItem; className?: string }) {
  if (item.type === 'heal') {
    return <span className={cn('grid place-items-center', className)}><Heart className="h-[72%] w-[72%] fill-neo-pink stroke-black stroke-[2.5]" /></span>;
  }
  const src = item.type === 'relic' ? relicArt(item.id) : potionArt(item.id);
  // eslint-disable-next-line @next/next/no-img-element -- small static art
  return <img src={src} alt="" draggable={false} className={cn('object-contain drop-shadow-[2px_3px_0_rgba(0,0,0,0.55)]', className)} />;
}

/** Coin + price, always left-to-right so the number never flips in Hebrew. */
function PriceTag({ price, state }: { price: number; state: ShopRowState }) {
  const { t } = useLanguageSafe();
  return (
    <span className={cn('mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg border-2 border-black px-1.5 py-0.5 font-neo-display text-sm font-bold text-black shadow-[2px_2px_0_#000]',
      state === 'sold' ? 'bg-neo-cream' : state === 'buyable' ? 'bg-neo-yellow' : 'bg-white/60')}>
      {state === 'sold' ? t('adventurePlay.map.shopSold') : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
          <img src={COIN_ART} alt="" aria-hidden className="h-4 w-4 object-contain" />
          <bdi dir="ltr" className="tabular-nums">{t('adventurePlay.map.shopBuy', { price })}</bdi>
        </>
      )}
    </span>
  );
}

export default function ShopScreen({ items, bought, run, world, busy, onBuy, onLeave }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const reduce = useReducedMotion();
  const [confirm, setConfirm] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Line[] | null>(null);
  // The run as it stood on the last render — a receipt is a real diff, never the promise on the tag.
  const seenRef = useRef<PublicRun>(run);

  // A purchase landed (the server handed back a changed run): print what it really did.
  if (seenRef.current !== run) {
    const before = seenRef.current;
    seenRef.current = run;
    if (before.gold !== run.gold || before.relics.length !== run.relics.length) setReceipt(runDelta(before, run));
  }

  const open = (index: number) => {
    setConfirm(index);
    sfx.playMenuOpenSound?.();
  };
  const buy = (index: number) => {
    setConfirm(null);
    sfx.playUpgradePurchaseSound?.();
    sfx.playCoinCollectSound?.();
    onBuy(index);
  };

  const item = confirm != null ? items[confirm] : null;
  const text = item ? shopItemText(item) : null;
  const frame = item ? RARITY_FRAME[rarityOf(item)] : null;

  return (
    <NodeShell kind="shop" world={world} title={t('adventurePlay.map.shopTitle')}
      gold={run.gold} hp={run.hp} maxHp={run.maxHp} busy={busy}
      footer={(
        <div className="space-y-2">
          {/* The last purchase's real ledger, pinned over the shelf so it never hides a row. */}
          <AnimatePresence>
            {receipt && (
              <motion.div key={receipt.map((l) => l.key).join()}
                initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-xl border-[3px] border-black bg-black/85 px-2 py-1.5">
                <DeltaChips lines={receipt} size="sm" testId="shop-receipt" />
              </motion.div>
            )}
          </AnimatePresence>
          <NodeButton testId="node-leave" onClick={onLeave} tone="cream" disabled={busy}>{t('adventurePlay.map.leave')}</NodeButton>
        </div>
      )}>

      {/* The keeper himself: the backdrop puts him behind the counter, where a
          full shelf hides him, so his face and his line ride above the stock. */}
      <motion.div
        initial={reduce ? false : { x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="mb-2 flex items-center gap-2">
        {/* The keeper's hood sits at ~49% x / ~76% y of the painted scene and
            spans about a quarter of its width: at 230% the crop landed on empty
            counter and read as a dark blob. 390% frames the hood. */}
        <span aria-hidden data-testid="shop-keeper"
          className="h-14 w-14 shrink-0 rounded-full border-[3px] border-black bg-[#121d42] bg-[length:390%] bg-[position:49%_75%] shadow-[3px_3px_0_#000]"
          style={{ backgroundImage: `url(${nodeScene('shop', world)})` }} />
        <p className="min-w-0 flex-1 rounded-2xl border-[3px] border-black bg-neo-cream px-2.5 py-1.5 font-neo-display text-sm font-bold leading-snug text-black shadow-[3px_3px_0_#000]">
          {t(shopGreetingKey(items, run, bought))}
        </p>
      </motion.div>

      <ul className="grid grid-cols-2 gap-2 pb-2">
        {items.map((it, i) => {
          const state = shopRowState(it, run, bought, i);
          const info = shopItemText(it);
          const rf = RARITY_FRAME[rarityOf(it)];
          const short = it.price - run.gold;
          return (
            <li key={`${it.type}-${i}`} className="min-w-0">
              <motion.button
                type="button"
                data-testid={`shop-item-${i}`}
                data-state={state}
                disabled={state !== 'buyable' || busy}
                aria-label={`${t(info.nameKey, info.nameParams)} — ${t('adventurePlay.map.shopBuy', { price: it.price })}`}
                onClick={() => open(i)}
                initial={reduce ? false : { y: 24, opacity: 0 }}
                /* Same rule as the chest: the sold card's fade has to be the animated
                   value, not a class this element's inline opacity overwrites. */
                animate={{ y: 0, opacity: state === 'sold' ? 0.8 : 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24, delay: reduce ? 0 : 0.05 * i }}
                whileTap={state === 'buyable' && !reduce ? { scale: 0.96 } : undefined}
                className={cn('relative flex h-full w-full flex-col items-center rounded-2xl border-[3px] border-black bg-[#121d42] p-1.5 pt-0 text-center shadow-[4px_4px_0_#000] disabled:cursor-default',
                  state === 'sold' && 'saturate-[0.6]')}
              >
                {/* Only the GOODS grey out. Desaturating the whole card also
                    greys the pink "N gold short" line and the price — the two
                    things a player who cannot afford this row has to read. */}
                <span data-testid={`shop-item-goods-${i}`} className={cn('flex w-full flex-col items-center',
                  (state === 'poor' || state === 'full') && 'opacity-55 grayscale')}>
                  <span className={cn('absolute inset-x-0 top-0 rounded-t-[13px] border-b-[3px] border-black px-1 py-0.5 text-[9px] font-black uppercase tracking-wider text-black', rf.bg)}>
                    {t(info.kindKey)}
                  </span>
                  <span className="relative mt-[1.35rem] grid h-14 w-14 place-items-center">
                    <span aria-hidden className="absolute inset-1 rounded-full opacity-60 blur-md" style={{ background: rf.glow }} />
                    <ItemArt item={it} className="relative h-full w-full" />
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-1 w-full font-neo-display text-[13px] font-bold leading-tight">{t(info.nameKey, info.nameParams)}</span>
                <span className="mt-0.5 line-clamp-2 min-h-[1.9rem] w-full text-[10px] font-semibold leading-snug opacity-85">{t(info.descKey, info.descParams)}</span>
                <PriceTag price={it.price} state={state} />
                {state === 'poor' && (
                  <span className="mt-1 block w-full rounded-md border-2 border-black bg-neo-pink px-1 py-px text-[9px] font-black uppercase leading-tight text-black">{t('adventurePlay.node.shortBy', { amount: short })}</span>
                )}
                {state === 'full' && (
                  <span className="mt-1 block w-full rounded-md border-2 border-black bg-neo-cyan px-1 py-px text-[9px] font-black uppercase leading-tight text-black">{t('adventurePlay.node.shopFull')}</span>
                )}
                {/* A bargain the shelf can prove: bottom quarter of this
                    rarity's price band. Hidden once the row is sold. */}
                {state !== 'sold' && isOnSale(it) && (
                  <span data-testid={`shop-sale-${i}`} aria-hidden
                    className="pointer-events-none absolute -end-1.5 top-4 -rotate-12 rounded-md border-2 border-black bg-neo-pink px-1.5 py-px font-neo-display text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000]">
                    {t('adventurePlay.node.shopSale')}
                  </span>
                )}
                {state === 'sold' && (
                  <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="-rotate-12 rounded-lg border-[3px] border-black bg-neo-lime px-2 py-0.5 font-neo-display text-base font-black text-black shadow-[3px_3px_0_#000]">
                      {t('adventurePlay.map.shopSold')}
                    </span>
                  </span>
                )}
              </motion.button>
            </li>
          );
        })}
      </ul>

      {/* Confirm sheet: cost and effect restated before the gold goes. */}
      <AnimatePresence>
        {item && text && frame && (
          <motion.div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)}>
            <motion.div role="dialog" aria-modal="true" data-testid="shop-confirm"
              initial={reduce ? false : { scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={reduce ? undefined : { scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl border-[3px] border-black bg-[#121d42] p-4 text-center shadow-[6px_6px_0_#000]">
              <span className="relative mx-auto grid h-24 w-24 place-items-center">
                <span aria-hidden className="absolute inset-2 rounded-full opacity-70 blur-lg" style={{ background: frame.glow }} />
                <ItemArt item={item} className="relative h-full w-full" />
              </span>
              <p className="mt-1 font-neo-display text-xl font-bold">{t(text.nameKey, text.nameParams)}</p>
              <p className="mt-1 text-sm font-semibold leading-snug opacity-90">{t(text.descKey, text.descParams)}</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg border-2 border-black bg-neo-yellow px-2 py-0.5 font-neo-display font-bold text-black">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                <img src={COIN_ART} alt="" aria-hidden className="h-4 w-4 object-contain" />
                <bdi dir="ltr" className="tabular-nums">{t('adventurePlay.node.confirmCost', { price: item.price, left: run.gold - item.price })}</bdi>
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border-[3px] border-black bg-neo-cream px-2 py-2 font-neo-display font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
                  <X className="mx-auto h-5 w-5" aria-hidden />
                  <span className="sr-only">{t('adventurePlay.node.cancel')}</span>
                </button>
                <button type="button" data-testid="shop-confirm-buy" onClick={() => buy(confirm as number)} disabled={busy}
                  className="flex-[2] rounded-xl border-[3px] border-black bg-neo-lime px-2 py-2 font-neo-display text-lg font-bold text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none disabled:opacity-50">
                  {t('adventurePlay.node.buy')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NodeShell>
  );
}
