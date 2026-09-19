'use client';

import React, { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import Image from 'next/image';
import { Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParallax } from '@/hooks/useParallax';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldColors,
  getWorldGlow,
  type WorldConfig,
} from '@/lib/adventure';
import {
  WORLD_IMAGES,
  cardVariants,
} from './levelGridConfig';
import { canPlayLevel } from '@/lib/adventure/play/progress';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import LevelGridHeader from './LevelGridHeader';
import RPGLevelCard from './RPGLevelCard';
import { readRun } from './play/runStorage';
import { levelThreat, runPathState, KIND_META } from './play/variants/levelKinds';
import KindBadge from './play/variants/KindBadge';
import DifficultyRamp from './play/variants/DifficultyRamp';
import { TRAIL_W, TRAIL_H, trailNodes, nodeStatus, linkDone, linkPaths, rampOf } from './play/variants/trailLayout';
import './LevelGrid.css';

interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void;
}

const enemyArtFor = (world: number, kind: string) =>
  kind === 'elite' ? `/images/adventure/enemies/w${world}-idle.webp`
    : kind === 'boss' ? `/videos/adventure/boss-w${world}.webp` : undefined;

// Seeded random for stable particle positions
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Background particle count (Lucide icons instead of emojis)
const PARTICLE_COUNT = 9;

// Extracted to module-level constant to prevent useParallax re-subscribing RAF/listeners every render
const LEVEL_GRID_PARALLAX_OPTIONS = {
  intensity: 1.0,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: true,
  ambientSpeed: 0.6,
} as const;

/**
 * LevelGrid — RPG-style level select with immersive world background
 * Features: Shield header, decluttered RPG cards, boss card, milestone dividers,
 * god-rays, Lucide icon particles, bottom mist
 */
const LevelGrid = memo(function LevelGrid({
  world,
  completions,
  onLevelSelect,
}: LevelGridProps): React.JSX.Element {
  // Interactive parallax from gyroscope/mouse/touch
  useParallax(LEVEL_GRID_PARALLAX_OPTIONS);
  const { t } = useLanguage();

  // Active run (sessionStorage) → the path's cleared / current / ahead marks. Read after mount (no SSR mismatch).
  const [runStep, setRunStep] = useState<number | null>(null);
  useEffect(() => { setRunStep(readRun(world.id)?.run.step ?? null); }, [world.id]);

  // Compute level data
  const levels = useMemo(() => {
    const result = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const levelNum = i + 1;
      const completion = completions.find(
        (c) => c.world === world.id && c.level === levelNum
      );
      const isUnlocked = canPlayLevel(completions, world.id, levelNum);
      const stars = completion?.stars || 0;
      const isPerfect = stars === MAX_STARS_PER_LEVEL;
      const isBoss = levelNum === LEVELS_PER_WORLD;
      const lvl = getPlayLevel(world.id, levelNum);

      return { levelNum, isUnlocked, stars, isPerfect, isBoss, kind: lvl.kind, threat: levelThreat(lvl) };
    });

    // Find first unlocked level with 0 stars = current level
    const currentNum = result.find((l) => l.isUnlocked && l.stars === 0)?.levelNum ?? -1;

    return result.map((l) => ({
      ...l,
      isCurrent: l.levelNum === currentNum,
      pathState: runPathState(l.levelNum, runStep),
    }));
  }, [world.id, completions, runStep]);

  // Aggregate stats — reuse levels array instead of re-filtering completions
  const { worldStars, maxWorldStars, completedLevels, worldColors, glowColor } = useMemo(() => ({
    worldStars: levels.reduce((sum, l) => sum + l.stars, 0),
    maxWorldStars: LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL,
    completedLevels: levels.filter((l) => l.stars > 0).length,
    worldColors: getWorldColors(world.colorPrimary),
    glowColor: getWorldGlow(world.colorPrimary),
  }), [levels, world.colorPrimary]);

  const worldImage = WORLD_IMAGES[world.id];

  // Auto-scroll to current level on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentLevelNum = useMemo(
    () => levels.find((l) => l.pathState === 'current')?.levelNum ?? levels.find((l) => l.isCurrent)?.levelNum ?? null,
    [levels]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || currentLevelNum == null) return;

    // Wait for parent slide-in (300ms) + stagger animations to settle
    const timer = setTimeout(() => {
      const el = container.querySelector<HTMLElement>(
        `[data-testid="level-card-${currentLevelNum}"]`
      );
      if (!el) return;

      // Center the node without el.scrollIntoView() (it bubbles to every scrollable
      // ancestor and can drag the page to the footer). Scroll the panel; when the
      // page owns the scroll instead (phone layout: the panel never overflows),
      // bring just this node into the window's middle.
      const rect = el.getBoundingClientRect();
      const delta = rect.top - container.getBoundingClientRect().top - (container.clientHeight - rect.height) / 2;
      container.scrollBy({ top: delta, behavior: 'smooth' });
      const panelScrolls = container.scrollHeight > container.clientHeight + 1;
      if (!panelScrolls && rect.height > 0 && (rect.bottom > window.innerHeight - 80 || rect.top < 80)) {
        window.scrollBy({ top: rect.top - (window.innerHeight - rect.height) / 2, behavior: 'smooth' });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [world.id, currentLevelNum]);

  // Stable click handler
  const handleLevelClick = useCallback(
    (levelNum: number) => onLevelSelect(world.id, levelNum),
    [world.id, onLevelSelect]
  );

  // Generate particle positions (stable across renders)
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      icon: i % 2 === 0 ? 'sparkles' : 'star',
      left: seededRandom(i * 2.3) * 90 + 5,
      top: seededRandom(i * 3.1) * 80 + 10,
      size: 8 + seededRandom(i * 4.7) * 8,
      duration: 5 + seededRandom(i * 5.3) * 3,
      delay: seededRandom(i * 6.1) * 3,
      opacity: 0.12 + seededRandom(i * 7.2) * 0.18,
    })),
  []);

  // The world trail: nodes zig-zag down, elite + boss span the full width.
  const worldTwist = useMemo(() => {
    for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
      const lv = getPlayLevel(world.id, l);
      if (lv.twist) return lv;
    }
    return null;
  }, [world.id]);

  const bossCfg = getBossConfig(world.id);
  const bossName = bossCfg ? t(bossCfg.displayName) : undefined;
  const eliteName = t(`adventurePlay.combat.elite.w${world.id}`);

  // The world trail: a climbing node map, level 1 at the bottom, the boss on top.
  const trail = useMemo(() => {
    const nodes = trailNodes(levels.map((l) => l.kind));
    const status = levels.map((l) => nodeStatus(l));
    const paths = linkPaths(nodes);
    return { nodes, status, paths };
  }, [levels]);
  const ramp = useMemo(() => rampOf(world.id), [world.id]);
  const currentStatusIdx = trail.status.indexOf('current');
  return (
    <div data-testid="level-grid" className="relative h-full">
      {/* Background layers — absolute sibling, NOT fixed inside scroll container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Dark base */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{ '--parallax-depth': '0.05', backgroundColor: 'rgb(12, 12, 35)' } as React.CSSProperties}
        />

        {/* World image — higher opacity for immersion */}
        <div
          className="absolute inset-0 level-grid-parallax-layer level-grid-parallax-css-scaled"
          style={{ '--parallax-depth': '0.12', '--parallax-scale': '1.15' } as React.CSSProperties}
        >
          <Image src={worldImage} alt="" role="presentation" fill sizes="100vw" className="object-cover opacity-[0.45]" priority />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10, 10, 30, 0.4)' }} />
        </div>

        {/* God-rays */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none level-grid-god-rays">
          <div
            className="absolute"
            style={{
              top: '-50px', right: '-30px', width: '300px', height: '600px',
              background: `linear-gradient(210deg, ${glowColor}18 0%, transparent 60%)`,
              transform: 'rotate(-5deg)',
            }}
          />
          <div
            className="absolute"
            style={{
              top: '-20px', right: '60px', width: '150px', height: '450px',
              background: `linear-gradient(220deg, ${glowColor}0F 0%, transparent 50%)`,
              transform: 'rotate(-15deg)',
            }}
          />
        </div>

        {/* Accent highlight */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{ '--parallax-depth': '0.2' } as React.CSSProperties}
        >
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[min(90%,300px)] h-[min(60%,200px)] rounded-full"
            style={{ backgroundColor: glowColor, opacity: 0.15 }}
          />
        </div>

        {/* Lucide icon particles */}
        <div className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none level-grid-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                opacity: p.opacity,
                '--particle-duration': `${p.duration}s`,
                '--particle-delay': `${p.delay}s`,
              } as React.CSSProperties}
            >
              {p.icon === 'sparkles' ? (
                <Sparkles style={{ width: p.size, height: p.size, color: glowColor }} />
              ) : (
                <Star style={{ width: p.size, height: p.size, color: 'rgba(255,225,53,0.5)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Bottom mist */}
        <div
          className="absolute bottom-0 left-0 w-full h-32 pointer-events-none"
          style={{ background: `linear-gradient(180deg, transparent 0%, ${glowColor}08 60%, ${glowColor}15 100%)` }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }} />
      </div>

      {/* Scrollable content layer */}
      <div ref={scrollContainerRef} className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="relative pt-6 sm:pt-8 pb-8 px-4 sm:px-6 max-w-3xl mx-auto">
        <LevelGridHeader
          world={world}
          worldStars={worldStars}
          maxWorldStars={maxWorldStars}
          completedLevels={completedLevels}
          totalLevels={LEVELS_PER_WORLD}
          glowColor={glowColor}
          worldColors={worldColors}
        >
          <div className="grid gap-2">
            {worldTwist && (
              <div data-testid="chapter-intro" className="flex items-start gap-2.5 rounded-xl border-[3px] border-black bg-[#0f1b3d] px-3 py-2">
                <KindBadge kind={worldTwist.kind} label={t(`adventurePlay.variety.kind.${worldTwist.kind}`)} size="md" iconOnly />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: KIND_META[worldTwist.kind].hex }}>
                    {t('adventurePlay.variety.worldNewRule')}
                  </div>
                  <p className="text-sm font-bold leading-snug text-neo-cream">{t(`adventurePlay.variety.twist.${worldTwist.twist}`)}</p>
                </div>
              </div>
            )}
            <DifficultyRamp steps={ramp} current={currentStatusIdx >= 0 ? currentStatusIdx + 1 : null}
              title={t('adventurePlay.variety.rampTitle')}
              describe={(st) => `${t('adventurePlay.variety.pathLabel', { level: st.level, total: LEVELS_PER_WORLD })}, ${t(`adventurePlay.variety.kind.${st.kind}`)}, ${t('adventurePlay.variety.threat', { threat: st.threat })}`} />
          </div>
        </LevelGridHeader>

        {/* World trail — node map (climbs to the boss) */}
        <div data-testid="level-trail" dir="ltr"
          className="trail-board relative mx-auto mt-2 w-full max-w-[560px] md:w-[max(360px,min(100%,calc((100dvh-240px)*0.595)))]"
          style={{ aspectRatio: `${TRAIL_W} / ${TRAIL_H}` }}>
          {/* danger rises toward the boss: calm at the bottom, hot at the top */}
          <div aria-hidden className="absolute inset-x-[-4%] inset-y-0 rounded-3xl opacity-60"
            style={{ background: 'linear-gradient(0deg, rgba(191,255,0,0.10) 0%, rgba(255,225,53,0.08) 45%, rgba(255,51,102,0.22) 100%)' }} />
          <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox={`0 0 ${TRAIL_W} ${TRAIL_H}`}>
            {trail.paths.map((d, i) => {
              const upper = trail.status[i + 1];
              const walked = linkDone(upper);
              const next = i === currentStatusIdx;
              return (
                <g key={d} data-testid="trail-link" data-walked={walked}>
                  <path d={d} fill="none" stroke="#000" strokeWidth={walked ? 6.5 : 4.5} strokeLinecap="round" />
                  <path d={d} fill="none" strokeLinecap="round"
                    className={next ? 'trail-link-walked' : undefined}
                    stroke={walked ? '#bfff00' : next ? '#bfff00' : 'rgba(255,248,231,0.55)'}
                    strokeWidth={walked ? 3.6 : 2.2}
                    strokeDasharray={walked ? undefined : next ? undefined : '2.5 3'} />
                </g>
              );
            })}
          </svg>
          {trail.nodes.map((n, i) => {
            const level = levels[i];
            return (
              <AdaptiveMotion.div key={n.level} variants={cardVariants} initial="hidden" animate="visible"
                transition={{ delay: 0.05 * i }}
                className="absolute"
                style={{ left: `${n.x - n.size / 2}%`, top: `${((n.y - n.size / 2) / TRAIL_H) * 100}%`, width: `${n.size}%`, aspectRatio: '1 / 1', zIndex: trail.status[i] === 'current' ? 30 : 10 + i }}>
                <RPGLevelCard
                  levelNum={n.level}
                  stars={level.stars}
                  maxStars={MAX_STARS_PER_LEVEL}
                  kind={n.kind}
                  status={trail.status[i]}
                  isPerfect={level.isPerfect}
                  threat={level.threat}
                  labelSide={n.labelSide}
                  onClick={() => handleLevelClick(n.level)}
                  enemyArt={enemyArtFor(world.id, n.kind)}
                  enemyName={n.kind === 'boss' ? bossName : n.kind === 'elite' ? eliteName : undefined}
                />
              </AdaptiveMotion.div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
});

LevelGrid.displayName = 'LevelGrid';
export default LevelGrid;
