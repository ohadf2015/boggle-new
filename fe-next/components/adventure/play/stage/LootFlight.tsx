'use client';

/**
 * The corpse pays out: gold coins (and the relic it dropped) physically arc out
 * of the dead foe on the arena stage and land in the run HUD — the gold pill and
 * the relic bar — so the reward is something you watched travel, not a number
 * that changed while you looked away.
 *
 * Portalled + pointer-events-none, so it can leave the canvas without being
 * clipped by it.
 *
 * IT HAS A DEADLINE. `CombatOverlay` slams an opaque full-screen kill banner
 * over everything `KILL_DELAY_MS` (1150ms) after the foe dies — the corpse it
 * launches from and the HUD it lands in both vanish behind it. The whole payout
 * therefore plays inside `LOOT_WINDOW_MS`, and `lootBurst` times every piece to
 * land before the curtain rather than after it.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { lootBurst, LOOT_WINDOW_MS, type LootPiece } from '../arena/arenaBeats';
import { relicArt } from '../run/art';
import type { RelicId } from '@/lib/adventure/play/relics';

const COIN = '/images/adventure/loot/gold-coin.webp';

interface Pt { x: number; y: number }

interface Props {
  /** Where the corpse is, in viewport px. Null = nothing to pay out. */
  from: Pt | null;
  gold: number;
  relic: RelicId | null;
  onDone?: () => void;
}

const box = (el: Element | null): Pt | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** The gold pill in the run HUD, the last relic slot, or the top corner. */
function target(kind: LootPiece['kind']): Pt {
  if (kind === 'relic') {
    const slots = Array.from(document.querySelectorAll('[data-relic]'));
    const at = box(slots[slots.length - 1] ?? null);
    if (at) return at;
  }
  const gold = box(document.querySelector('[data-testid="run-hud"] img[src*="gold-coin"]'));
  if (gold) return gold;
  return { x: window.innerWidth - 40, y: 120 };
}

export default function LootFlight({ from, gold, relic, onDone }: Props) {
  const reduce = useReducedMotion();
  const [pieces, setPieces] = useState<Array<LootPiece & { to: Pt; id: number }> | null>(null);

  useEffect(() => {
    if (!from || reduce) { setPieces(null); return; }
    setPieces(lootBurst(gold, !!relic).map((p, i) => ({ ...p, id: i, to: target(p.kind) })));
    const id = setTimeout(() => { setPieces(null); onDone?.(); }, LOOT_WINDOW_MS + 120);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one payout per corpse
  }, [from?.x, from?.y, reduce]);

  if (!from || !pieces?.length || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[59] pointer-events-none overflow-hidden" aria-hidden>
      {pieces.map((p) => {
        const mid = { x: from.x + (p.to.x - from.x) * 0.45 + p.spread * 70, y: Math.min(from.y, p.to.y) - 64 };
        const size = p.kind === 'relic' ? 44 : 22;
        return (
          <motion.img
            key={p.id}
            src={p.kind === 'relic' && relic ? relicArt(relic) : COIN}
            alt=""
            draggable={false}
            className="absolute drop-shadow-[2px_2px_0_#000]"
            style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
            initial={{ x: from.x, y: from.y, scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{
              x: [from.x, mid.x, p.to.x],
              y: [from.y, mid.y, p.to.y],
              scale: [0.3, p.kind === 'relic' ? 1.25 : 1, 0.45],
              opacity: [0, 1, 1, 0],
              rotate: [0, p.spread * 180, 0],
            }}
            transition={{ duration: p.durationMs / 1000, delay: p.delayMs / 1000, ease: 'easeInOut', times: [0, 0.55, 1] }}
          />
        );
      })}
    </div>,
    document.body,
  );
}
