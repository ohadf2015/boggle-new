'use client';

/**
 * The cast — EVERY valid word, not just big ones: the letters lift off their tiles into one
 * big glowing gem-tile word hanging above the board with a praise speech bubble; glowing
 * bolts of each letter dive into the target; on impact a tiered damage number, flash,
 * debris and recoil. The word hangs until ~1.15s. Rendered in a body
 * portal (fixed, pointer-events none) so the flight can leave the board and is not
 * dragged along by the board / screen shake transforms.
 */
import { createPortal } from 'react-dom';
import { useEffect, useState, type CSSProperties } from 'react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TIER_STYLE, impactLook, praiseLook, type HitTier } from './hitTier';
import { boltKeyframes, flightKeyframes, letterGems, type RowSlot } from './castPath';
import { countTween } from './markSpot';

export interface Box { x: number; y: number; w: number; h: number }

export interface CastData {
  id: number;
  /** Each letter: its source tile + its slot in the mid-air word banner. */
  letters: Array<{ ch: string; box: Box; slot?: RowSlot }>;
  target: { x: number; y: number };
  tier: HitTier;
  /** 0..1 — word length (+ relic boost). Scales number, flash, particles. */
  power: number;
  /** Unit vector the target is knocked along (letters' travel direction). */
  knock: { kx: number; ky: number };
  pts: number;
  bannerKey: string;
  /** Combat target (enemy/boss) → "-N" damage; otherwise "+N" points. */
  combat: boolean;
  impactMs: number;
  stagger: number;
  /** Gap between bolts diving. */
  boltStagger: number;
  /** One letter's lift → landing. */
  landMs: number;
  /** One bolt's travel time. */
  flightMs: number;
  /** Letters settled in the banner row. */
  snapMs: number;
  /** First bolt leaves for the target. */
  diveAt: number;
  /** Banner + praise hang until this. */
  holdMs: number;
  /** Longest word so far this level (6+ letters) → ribbon. */
  best: boolean;
  /** A deed (DeedStamp owns the screen-wide slab for it) → the praise stays a bubble so the two never stack. */
  deed?: boolean;
  /** This blow knocks the enemy out (set on impact) → loudest praise slab. */
  ko?: boolean;
  /** The hit sprite (enemy / boss art): a white afterimage of it is knocked off on impact. */
  foe?: { box: Box; src: string; fit: string; pos: string } | null;
}

type Vars = CSSProperties & Record<`--adv-${string}`, string>;

/** Run a WAAPI animation once per mounted element (jsdom has no `animate`). */
const once = (el: HTMLElement | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
  if (!el || el.dataset.flown || typeof el.animate !== 'function') return;
  el.dataset.flown = '1';
  el.animate(frames, opts);
};

/** The damage number counts up from 0 as it slams in, so every frame of the hit reads differently. */
function DmgCount({ pts, combat }: { pts: number; combat: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    // setTimeout ticks (~30fps) — a number ticking up needs no more, and it stays testable.
    const t0 = Date.now();
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const v = countTween(0, pts, Date.now() - t0, 380);
      setN(v);
      if (v !== pts) id = setTimeout(tick, 32);
    };
    id = setTimeout(tick, 16);
    return () => clearTimeout(id);
  }, [pts]);
  return <>{combat ? `-${n}` : `+${n}`}</>;
}

export default function WordCast({ cast, impacted }: { cast: CastData; impacted: boolean }) {
  const { t } = useLanguageSafe();
  if (typeof document === 'undefined') return null;
  const style = TIER_STYLE[cast.tier];
  const look = impactLook(cast.power, cast.tier);
  const { target, letters } = cast;
  const gems = letterGems(letters.map((l) => l.ch));
  const vw = window.innerWidth;
  // Half-width of the number at its 1.45x pop peak (Fredoka digits ~0.6em), so it never clips.
  const half = Math.max(look.numberPx, (String(cast.pts).length + 1) * look.numberPx * 0.7 * 0.5 * 1.45) + 10;
  // The number + POW pop BESIDE the foe (toward screen centre), never on top of it, so the
  // enemy's flash + recoil stays in view on every frame of the hit.
  const fb = cast.foe?.box;
  const side = fb ? (fb.x + fb.w / 2 <= vw / 2 ? fb.x + fb.w + half * 0.55 : fb.x - half * 0.55) : target.x;
  const cx = Math.min(vw - half, Math.max(half, side));
  const numY = Math.max(look.numberPx * 0.7, fb ? fb.y + fb.h * 0.32 : target.y);
  // Praise bubble sits above the hanging word, centred on it.
  const slots = letters.map((l) => l.slot).filter((sl): sl is RowSlot => !!sl);
  const rowY = slots[0]?.y ?? target.y + 90;
  const rowSize = slots[0]?.size ?? 56;
  const rowX = slots.length ? (Math.min(...slots.map((sl) => sl.x)) + Math.max(...slots.map((sl) => sl.x))) / 2 : vw / 2;
  const rowW = slots.length ? Math.max(...slots.map((sl) => sl.x)) - Math.min(...slots.map((sl) => sl.x)) + rowSize : rowSize;
  const loud = praiseLook(cast.tier, cast.power, !!cast.ko);
  const praise = cast.deed ? { ...loud, slab: false } : loud;
  const bubbleY = rowY - rowSize / 2 - praise.px * (praise.slab ? 0.6 : 0.9) - 10;
  // Particles: an uneven ring (big + small chunks) so the burst reads as debris, not a clock face.
  const ring = (n: number, radius: number, size: number) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.35;
    const r = radius * (0.38 + ((i * 7) % 5) * 0.09);
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, s: size + ((i * 5) % 3) * 5 };
  });
  const sparks = ring(look.sparks, look.flashPx, 8 + Math.round(cast.power * 6));
  // Twinkling stars framing the whole hanging word, popping in as it assembles.
  const starCount = 6 + Math.round(cast.power * 4);
  const stars = Array.from({ length: starCount }, (_, i) => {
    const a = (i / starCount) * Math.PI * 2 + 0.4;
    return { x: rowX + Math.cos(a) * (rowW / 2 + 18 + (i % 2) * 14), y: rowY + Math.sin(a) * (rowSize * 0.75 + (i % 3) * 8), s: 20 + ((i * 7) % 3) * 8, d: Math.round(cast.snapMs * 0.4 + ((i * 97) % 5) * 70) };
  });
  const heavy = cast.tier === 'crit' || cast.power >= 0.7;
  const bubbleAt = Math.round(cast.snapMs * 0.7); // praise lands as the word completes
  const decay = Math.max(300, cast.holdMs - cast.impactMs);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden data-testid="adv-word-cast" data-tier={cast.tier}>
      {/* Sunburst behind the hanging word: grows as it assembles, spins, fades with the decay. */}
      <span className="adv-cast-burst" data-testid="adv-cast-burst"
        style={{ left: rowX, top: rowY, width: rowW + 120 + cast.power * 60, height: rowW + 120 + cast.power * 60, '--adv-glow': gems[0]?.glow ?? style.banner, animationDuration: `${cast.holdMs}ms` } as Vars} />
      {stars.map((st, i) => (
        <span key={`st${i}`} className="adv-cast-star"
          style={{ left: st.x, top: st.y, width: st.s, height: st.s, '--adv-glow': gems[i % Math.max(1, gems.length)]?.fill ?? style.banner, animationDelay: `${st.d}ms`, animationDuration: `${Math.max(300, cast.holdMs - st.d)}ms` } as Vars} />
      ))}
      {/* Source burst: each traced tile pops + throws a few chips, in step with its letter lifting. */}
      {letters.map(({ box }, i) => (
        <span key={`b${i}`}>
          <span className="adv-tile-burst" style={{ left: box.x, top: box.y, width: box.w, height: box.h, '--adv-glow': gems[i].glow, animationDelay: `${i * cast.stagger}ms` } as Vars} />
          {ring(3, box.w * 1.6, 7).map((p, j) => (
            <span key={j} className="adv-spark adv-spark-src"
              style={{ left: box.x + box.w / 2, top: box.y + box.h / 2, width: p.s, height: p.s, animationDelay: `${i * cast.stagger}ms`, '--adv-dx': `${Math.round(p.dx)}px`, '--adv-dy': `${Math.round(p.dy)}px`, '--adv-glow': gems[(i + j) % gems.length].fill } as Vars} />
          ))}
        </span>
      ))}
      {/* The hanging word: each letter its own gem + glow, landing one by one. */}
      {letters.map(({ ch, box, slot }, i) => {
        const dur = Math.max(1, cast.holdMs - i * cast.stagger);
        return (
          <span key={`l${i}`} className={cn('adv-cast-letter', gems[i].rare && 'adv-cast-rare')} data-testid="adv-cast-letter" data-hit={impacted ? '1' : undefined}
            ref={(el) => once(el, flightKeyframes({
              wx: slot ? slot.x - (box.x + box.w / 2) : 0,
              wy: slot ? slot.y - (box.y + box.h / 2) : -30,
              ws: slot ? slot.size / box.w : 1, rot: i % 2 ? 10 : -10,
            }, cast.landMs / dur), { duration: dur, delay: i * cast.stagger, fill: 'both' })}
            style={{
              left: box.x, top: box.y, width: box.w, height: box.h,
              fontSize: Math.round(box.h * 0.6),
              background: gems[i].fill,
              '--adv-glow': gems[i].glow,
              '--adv-glow-px': `${Math.round(16 + cast.power * 22)}px`,
              animationDelay: `${i * 40}ms`,
            } as Vars}>
            {ch}
          </span>
        );
      })}
      {/* Bolts: a glowing copy of each letter streaks from the banner into the target. */}
      {letters.map(({ ch, box, slot }, i) => {
        const x0 = slot?.x ?? box.x + box.w / 2;
        const y0 = slot?.y ?? box.y + box.h / 2;
        const size = slot?.size ?? box.w;
        return (
          <span key={`v${i}`} className="adv-cast-bolt"
            ref={(el) => once(el, boltKeyframes({ dx: target.x - x0, dy: target.y - y0 }), { duration: cast.flightMs, delay: cast.diveAt + i * cast.boltStagger, fill: 'forwards' })}
            style={{ left: x0 - size / 2, top: y0 - size / 2, width: size, height: size, fontSize: Math.round(size * 0.6), background: gems[i].fill, '--adv-glow': gems[i].glow } as Vars}>
            {ch}
          </span>
        );
      })}
      {/* Praise scales with the word: small bubble → big bubble → screen-wide slab stamp (CRIT / K.O.). */}
      <span className={cn('adv-banner', praise.slab && 'adv-banner-slab')} key={cast.bannerKey} data-testid="adv-praise" data-slab={praise.slab ? '1' : undefined}
        style={{ left: praise.slab ? vw / 2 : rowX, top: bubbleY, fontSize: praise.px, background: style.banner, animationDelay: `${bubbleAt}ms`, animationDuration: `${Math.max(300, cast.holdMs - bubbleAt)}ms` }}>
        {t(cast.bannerKey)}
      </span>
      {cast.best && (
        <span className="adv-best-ribbon" data-testid="adv-best-ribbon"
          style={{ left: rowX, top: rowY + rowSize / 2 + 18, animationDelay: `${cast.snapMs}ms`, animationDuration: `${Math.max(300, cast.holdMs - cast.snapMs)}ms` }}>
          {t('adventurePlay.juice.newBest')}
        </span>
      )}
      {impacted && (
        <>
          {heavy && <span className="adv-crit-flash" style={{ '--adv-glow': style.banner } as Vars} />}
          {/* Comic POW starburst behind the number: the hit has a shape, not just a glow. */}
          <span className="adv-pow" data-testid="adv-pow" style={{ left: cx, top: numY, width: look.numberPx * 2.6, height: look.numberPx * 1.9, '--adv-glow': style.banner, animationDuration: `${Math.round(decay * 0.8)}ms` } as Vars} />
          {cast.foe && (
            // eslint-disable-next-line @next/next/no-img-element -- a white afterimage of the already-loaded foe sprite
            <img src={cast.foe.src} alt="" className="adv-foe-ghost" data-testid="adv-foe-ghost"
              style={{ left: cast.foe.box.x, top: cast.foe.box.y, width: cast.foe.box.w, height: cast.foe.box.h, objectFit: cast.foe.fit as CSSProperties['objectFit'], objectPosition: cast.foe.pos,
                '--adv-dx': `${Math.round(cast.knock.kx * (look.knockPx + 16))}px`, '--adv-dy': `${Math.round(cast.knock.ky * (look.knockPx + 16))}px` } as Vars} />
          )}
          <span className="adv-hit-flash" style={{ left: target.x, top: target.y, width: look.flashPx, height: look.flashPx, '--adv-glow': style.banner } as Vars} />
          <span className="adv-impact-ring" style={{ left: target.x, top: target.y, width: look.flashPx * 1.1, height: look.flashPx * 1.1, '--adv-glow': gems[0]?.glow ?? style.banner } as Vars} />
          {/* Echo ring: a second, slower shockwave so the hit keeps ringing through the decay. */}
          <span className="adv-impact-ring adv-impact-echo" style={{ left: target.x, top: target.y, width: look.flashPx * 1.5, height: look.flashPx * 1.5, '--adv-glow': gems[gems.length - 1]?.glow ?? style.banner, animationDuration: `${Math.round(decay * 0.9)}ms` } as Vars} />
          {sparks.map((p, i) => (
            <span key={`s${i}`} className="adv-spark"
              style={{ left: target.x, top: target.y, width: p.s, height: p.s, '--adv-dx': `${Math.round(p.dx)}px`, '--adv-dy': `${Math.round(p.dy)}px`, '--adv-glow': i % 3 === 0 ? style.fill : gems[i % Math.max(1, gems.length)]?.fill ?? style.fill, animationDuration: `${Math.round(decay * 0.85)}ms` } as Vars} />
          ))}
          <span className="adv-dmg tabular-nums" dir="ltr" data-testid="adv-dmg" data-power={cast.power}
            style={{ left: cx, top: numY, fontSize: look.numberPx, color: style.fill, WebkitTextStrokeWidth: look.numberPx > 70 ? 5 : 4, animationDuration: `${decay}ms` }}>
            <DmgCount pts={cast.pts} combat={cast.combat} />
          </span>
        </>
      )}
    </div>,
    document.body,
  );
}
