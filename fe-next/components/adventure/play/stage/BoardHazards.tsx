'use client';

/**
 * Board overlay for combat hazards: frozen / cursed tiles you tap to cleanse,
 * projectiles fired from the enemy's hand onto the board that you tap (or
 * swipe through) before they land, and the scramble "blind" that hides every
 * letter for a beat (its banner is AttackFlight's).
 *
 * Mounted inside the board wrapper (BoardFx). Tile rects are MEASURED from the
 * grid's `data-row/data-col` cells, so RTL/`dir=ltr` grids and padding never
 * drift. The layer is pointer-events:none — only hazard hitboxes take taps, so
 * dragging words across the board still works.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { PROJECTILE_MS, type CombatEvent, type CombatState } from '@/lib/adventure/play/combat';
import { projectileArt } from './combatView';

interface Rect { x: number; y: number; w: number; h: number }

interface Props {
  world: number;
  combat: CombatState | null;
  dispatchCombat: (ev: CombatEvent) => void;
  playing: boolean;
}

/** Deterministic landing tile per projectile id. */
const landingKey = (id: number, size: number) => {
  const n = (id * 7919) % (size * size);
  return `${Math.floor(n / size)}-${n % size}`;
};

export default function BoardHazards({ world, combat, dispatchCombat, playing }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const layer = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  // Where shots come FROM: the enemy's charge orb in the arena, relative to this layer.
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const measure = useCallback(() => {
    const el = layer.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const base = el.getBoundingClientRect();
    const out: Record<string, Rect> = {};
    host.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((cell) => {
      const r = cell.getBoundingClientRect();
      out[`${cell.dataset.row}-${cell.dataset.col}`] = { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    });
    setRects(out);
    const hand = document.querySelector('[data-enemy-anchor]')?.getBoundingClientRect();
    setOrigin(hand ? { x: hand.left + hand.width / 2 - base.left, y: hand.top + hand.height / 2 - base.top } : null);
  }, []);

  useLayoutEffect(() => {
    measure();
    const host = layer.current?.parentElement;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [measure]);
  // Tiles mount after the board deals; re-measure when hazards appear.
  const hazardCount = (combat?.tiles.length ?? 0) + (combat?.projectiles.length ?? 0);
  useEffect(() => { if (hazardCount) measure(); }, [hazardCount, measure]);

  useEffect(() => {
    if (!bursts.length) return;
    const id = setTimeout(() => setBursts((b) => b.slice(1)), 450);
    return () => clearTimeout(id);
  }, [bursts]);

  if (!combat) return <div ref={layer} className="absolute inset-0 pointer-events-none" aria-hidden />;

  const blind = combat.blindUntil > combat.now;
  const size = combat.size;
  const shot = projectileArt(world);

  const deflect = (id: number, x: number, y: number) => {
    if (!playing) return;
    setBursts((b) => [...b, { id, x, y }]);
    dispatchCombat({ type: 'swipeProjectile', id });
  };

  return (
    <div ref={layer} className="absolute inset-0 z-20 pointer-events-none" data-testid="board-hazards">
      {/* Frozen / cursed tiles — tap to cleanse */}
      {combat.tiles.map((tile) => {
        const r = rects[tile.key];
        if (!r) return null;
        const frozen = tile.kind === 'freeze';
        return (
          <motion.button
            key={`${tile.key}-${tile.until}`}
            type="button"
            disabled={!playing}
            onPointerDown={(e) => { e.stopPropagation(); dispatchCombat({ type: 'tapTile', key: tile.key }); }}
            aria-label={t(frozen ? 'adventurePlay.combat.thawTile' : 'adventurePlay.combat.cleanseTile')}
            className="absolute pointer-events-auto rounded-lg border-[3px] border-black grid place-items-center overflow-hidden touch-none"
            style={{
              left: r.x, top: r.y, width: r.w, height: r.h,
              // Translucent: the letter stays readable under the ice / hex.
              background: frozen ? 'linear-gradient(160deg,rgba(255,255,255,0.55),rgba(34,211,238,0.45))' : 'rgba(88,28,135,0.5)',
              boxShadow: frozen ? 'inset 0 0 14px #fff, 0 0 12px rgba(34,211,238,0.8)' : 'inset 0 0 16px #e879f9, 0 0 12px rgba(168,85,247,0.8)',
            }}
            initial={reduce ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- fx sprite */}
            <img src={frozen ? '/images/adventure/fx/ice-shard.webp' : '/images/adventure/fx/curse-glyph.webp'} alt=""
              className={frozen ? 'absolute -top-1 -right-1 w-1/2 h-1/2 object-contain rotate-12' : 'absolute inset-0 m-auto w-full h-full object-contain opacity-60 animate-pulse'} />
            <span className="absolute bottom-0.5 inset-x-0 text-center text-[9px] font-black uppercase text-white drop-shadow-[1px_1px_0_#000]">
              {t('adventurePlay.combat.tap')}
            </span>
          </motion.button>
        );
      })}

      {/* Scramble blind: every letter hidden until it passes */}
      <AnimatePresence>
        {blind && (
          <motion.div key={`blind-${combat.blindUntil}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Object.entries(rects).map(([key, r]) => (
              <div key={key} className="absolute rounded-lg border-[3px] border-black bg-[#1a1036] grid place-items-center font-neo-display font-black text-2xl text-neo-yellow"
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>?</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming projectiles — tap or swipe through them */}
      {combat.projectiles.map((p) => {
        const target = rects[landingKey(p.id, size)];
        if (!target) return null;
        const left = Math.max(0, p.landsAt - combat.now);
        const startFrac = Math.min(1, left / PROJECTILE_MS);
        const tx = target.x + target.w / 2;
        const ty = target.y + target.h / 2;
        // Fired from the enemy's hand; falls back to above the board.
        const sx = origin?.x ?? tx + ((p.id % 2 ? 1 : -1) * 60);
        const sy = origin?.y ?? -80;
        const cx = sx + (tx - sx) * (1 - startFrac);
        const cy = sy + (ty - sy) * (1 - startFrac);
        // Reduced motion (MotionConfig 'always'): the shot sits on its landing tile, still tappable.
        return (
          <div key={p.id}>
            {/* Landing marker */}
            <div className="absolute rounded-lg border-[3px] border-dashed border-neo-pink animate-pulse"
              style={{ left: target.x, top: target.y, width: target.w, height: target.h }} />
            <motion.button
              type="button"
              aria-label={t('adventurePlay.combat.deflect')}
              onPointerDown={(e) => { e.stopPropagation(); deflect(p.id, cx, cy); }}
              onPointerEnter={(e) => { if (e.buttons) deflect(p.id, cx, cy); }}
              className="absolute pointer-events-auto w-12 h-12 -ml-6 -mt-6 grid place-items-center touch-none"
              style={{ left: 0, top: 0 }}
              initial={{ x: cx, y: cy }}
              animate={{ x: tx, y: ty }}
              transition={{ duration: left / 1000, ease: 'easeIn' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fx sprite */}
              <img src={shot} alt="" className="w-12 h-12 object-contain rotate-45 drop-shadow-[2px_2px_0_#000]" />
            </motion.button>
          </div>
        );
      })}

      {/* Deflect bursts */}
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.img key={b.id} src="/images/adventure/fx/slash.webp" alt="" aria-hidden
            className="absolute w-20 h-20 -ml-10 -mt-10 object-contain"
            style={{ left: b.x, top: b.y }}
            initial={{ scale: 0.4, opacity: 1, rotate: -20 }} animate={{ scale: 1.4, opacity: 0, rotate: 10 }} transition={{ duration: 0.4 }} />
        ))}
      </AnimatePresence>
    </div>
  );
}
