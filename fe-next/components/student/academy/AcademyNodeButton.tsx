'use client';

/**
 * One island destination. Positioned by the map in PHYSICAL % of the art (the
 * islands do not move in Hebrew); only the label text follows the language.
 *
 * The node art stands ON the island (grounded by a painted contact shadow),
 * the recommended one glows, bobs and has a bouncing pointer over it, and a
 * tap squashes it and throws sparkles with a click SFX.
 */

import Image from 'next/image';
import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Flag, Lock, Moon, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import type { IslandPoint, NodeType } from './academyNodes';
import type { AcademyIsland } from './academyIslands';
import { Medallion, INK_TEXT, toneStyle, type Tone } from './chrome';
import { nodeSize, showBossChip, showTag } from './nodeExtents';

const ART: Record<NodeType, string> = {
  lesson: '/images/education/node-lesson.webp',
  quiz: '/images/education/node-quiz.webp',
  wordcraft: '/images/education/node-wordcraft.webp',
  arena: '/images/education/node-arena.webp',
  boss: '/images/education/node-boss.webp',
  locked: '/images/education/node-locked.webp',
};

const POINTER_FILL: Partial<Record<Tone, string>> = { gold: '#ffd23a', pink: '#ff3d9a', teal: '#1fc9c0' };

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

interface Props {
  node: AcademyIsland;
  at: IslandPoint;
  index: number;
  big: boolean;
  recommended: boolean;
  /** Word on the spotlight pointer — the same word the hero button leads with. */
  tag?: string;
  /** Spotlight colour (the hero button's) — used only when recommended. */
  tone?: Tone;
  onOpen: (node: AcademyIsland) => void;
  reducedMotion: boolean;
  /** Crowding level (see nodeExtents): sheds the boss chip, then size, then the tag word. */
  compact?: number;
  /** UI scale (TV): the whole button is zoomed by it. */
  scale?: number;
}

/** Sparkles that twinkle around the spotlit island (fixed spots, CSS loop). */
const TWINKLES = [
  { x: -8, y: 18, s: 14, d: 0 },
  { x: 104, y: 30, s: 11, d: 0.6 },
  { x: 96, y: 78, s: 9, d: 1.1 },
  { x: -2, y: 70, s: 10, d: 1.6 },
];

/** Two crossed chains over a locked node — ink under-stroke, steel links on top. */
function Chains() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-[6%] h-[88%] w-[88%]">
      {['M14 14 L86 86', 'M86 14 L14 86'].map((d) => (
        <g key={d}>
          <path d={d} stroke="#000" strokeWidth={11} strokeLinecap="round" />
          <path d={d} stroke="#b8bdd6" strokeWidth={6.5} strokeLinecap="round" strokeDasharray="9 5" />
          <path d={d} stroke="#eef0ff" strokeWidth={2} strokeLinecap="round" strokeDasharray="4 10" opacity={0.8} />
        </g>
      ))}
    </svg>
  );
}

type T = ReturnType<typeof useLanguage>['t'];

/** The island's plaque text (pure — the map also needs it to size the island's box). */
export function nodeLabel(node: Pick<AcademyIsland, 'kind' | 'name'>, t: T): string {
  switch (node.kind) {
    case 'workshop':
      return t('academy.student.workshop', 'Word Workshop');
    case 'review':
      return t('academy.student.review', 'Missed Words');
    case 'arena':
      return t('academy.student.arena', 'Class Arena');
    case 'boss':
      return t('academy.student.boss', 'Boss');
    default:
      return node.name ?? t('student.lessons.lesson', 'Lesson');
  }
}

/** The boss plaque's requirement chip ("Master 0/4 words" / "Unlocked"). */
export function bossChip(node: Pick<AcademyIsland, 'state' | 'progress'>, t: T): string | null {
  if (!node.progress) return null;
  return node.state === 'locked'
    ? t('academy.student.bossNeed', 'Master {have}/{need} words', { have: node.progress.have, need: node.progress.need })
    : t('academy.student.bossReady', 'Unlocked');
}

export function useNodeLabel(node: AcademyIsland): string {
  const { t } = useLanguage();
  return nodeLabel(node, t);
}

function BossRing({ have, need, size }: { have: number; need: number; size: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const frac = need > 0 ? Math.min(1, have / need) : 0;
  return (
    <svg aria-hidden="true" width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(90,70,190,0.55)" stroke="#000" strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3a2d80" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#ffd23a"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
      />
    </svg>
  );
}

export function AcademyNodeButton({ node, at, index, big, recommended, tag: tagWord, tone = 'gold', onOpen, reducedMotion, compact = 0, scale = 1 }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const osReduced = useReducedMotion();
  const still = reducedMotion || !!osReduced;
  const [burst, setBurst] = useState(0);
  const label = useNodeLabel(node);
  const isBoss = node.kind === 'boss';
  const locked = node.state === 'locked';
  const size = nodeSize(isBoss, { big, recommended, tag: !!tagWord, compact });
  const tag = showTag(compact) ? tagWord : undefined;
  const chip = isBoss && showBossChip(compact) ? bossChip(node, t) : null;
  // Everything that is not the spotlit island (or a live game) stays calm.
  const calm = !recommended && node.state !== 'live' && !locked;

  const aria = isBoss
    ? locked
      ? t('academy.student.bossLockedAria', 'Boss locked — master {have} of {need} words to unlock', {
          have: node.progress?.have ?? 0,
          need: node.progress?.need ?? 0,
        })
      : t('academy.student.bossOpenAria', 'Fight the boss')
    : node.state === 'done'
      ? t('academy.student.nodeDoneAria', '{name}: done, {stars} stars', { name: label, stars: node.stars })
      : node.kind === 'arena' && node.state === 'waiting'
        ? t('academy.student.arenaWaitingAria', '{name}: waiting for your teacher', { name: label })
        : t('academy.student.nodePlayAria', 'Play {name}', { name: label });

  const press = () => {
    if (!still) setBurst((b) => b + 1);
    if (locked) sfx.playErrorSound?.();
    else sfx.playButtonClickSound?.();
    onOpen(node);
  };

  const plaqueTone: Tone = recommended ? tone : node.state === 'live' ? 'pink' : node.state === 'done' ? 'teal' : 'night';
  const plaqueSize = isBoss
    ? big ? 'text-sm' : 'text-[11px]'
    : recommended ? (big ? 'max-w-[20rem] text-lg' : 'max-w-[12rem] text-[13px]') : big ? 'max-w-[16rem] text-sm' : 'max-w-[10rem] text-[11px]';
  const dark = plaqueTone === 'night';

  return (
    // A zero-size anchor at the island's point (in % of the art); the button
    // hangs off it, so the UI zoom scales the button and never its position.
    <span className="absolute z-10 h-0 w-0" style={{ left: `${at.x}%`, top: `${at.y}%` }}>
    {/* A div with the button role, not a <button>: a global landscape-phone rule
        forces every `button svg` to 20px (!important) and pads every button,
        which would crush the pointer, the boss ring and the chains. */}
    <m.div
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          press();
        }
      }}
      data-testid={`academy-node-${node.key}`}
      data-compact={compact}
      data-state={node.state}
      data-recommended={recommended ? 'true' : 'false'}
      aria-label={aria}
      onClick={press}
      className={cn(
        'absolute left-0 top-0 flex -translate-x-1/2 flex-col items-center outline-none',
        isBoss ? '-translate-y-1/2' : '-translate-y-[82%]',
        'focus-visible:[&>div]:ring-4 focus-visible:[&>div]:ring-neo-cyan focus-visible:[&>div]:rounded-full',
      )}
      style={{ maxWidth: 'none', cursor: 'pointer', ...(scale !== 1 ? { zoom: scale } : {}) }}
      initial={still ? false : { scale: 0, y: 24 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={still ? undefined : { scale: 1.06, y: -3 }}
      whileTap={{ scaleX: 1.14, scaleY: 0.84 }}
      transition={{ type: 'spring', stiffness: 420, damping: 15, delay: still ? 0 : 0.2 + index * 0.09 }}
    >
      {/* Bouncing pointer over the ONE recommended island. */}
      {recommended && (
        <m.span
          aria-hidden="true"
          data-testid="academy-spotlight-pointer"
          data-tone={tone}
          className={cn('absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center', tag ? '-top-[3.75rem] sm:-top-16' : '-top-9 sm:-top-11')}
          animate={still ? undefined : { y: [0, -9, 0] }}
          transition={still ? undefined : { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          {tag && (
            <span
              dir="auto"
              className="-mb-1 whitespace-nowrap rounded-full border-2 border-neo-black px-2.5 font-neo-display text-xs font-black uppercase leading-5 tracking-wider text-neo-black sm:text-sm"
              style={toneStyle(tone, { shadow: 2, trim: 1.5 })}
            >
              {tag}
            </span>
          )}
          <svg width="34" height="30" viewBox="0 0 34 30" className="drop-shadow-[2px_3px_0_#000]">
            <path d="M3 3 H31 L17 27 Z" fill={POINTER_FILL[tone] ?? '#ffd23a'} stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M9 7 H22 L16 17 Z" fill="#fff6b8" opacity="0.8" />
          </svg>
        </m.span>
      )}

      {node.state === 'done' && (
        <span className="mb-0.5 flex gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              strokeWidth={2.5}
              className={cn(
                big ? 'h-6 w-6' : 'h-[18px] w-[18px]',
                'drop-shadow-[1px_2px_0_#000]',
                i < node.stars ? 'fill-neo-yellow text-neo-black' : 'fill-[#2a2160] text-neo-black',
                i === 1 && '-translate-y-1',
              )}
            />
          ))}
        </span>
      )}

      <div className="relative" style={{ width: size, height: size }}>
        {/* Contact shadow: the art stands on the island, it does not float. */}
        {!isBoss && (
          <span
            aria-hidden="true"
            className="absolute bottom-[2%] left-1/2 h-[18%] w-[74%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[2px]"
          />
        )}
        {(recommended || node.state === 'live') && (
          <m.span
            aria-hidden="true"
            className="absolute -inset-[22%] rounded-full"
            style={{
              background:
                node.state === 'live' || tone === 'pink'
                  ? 'radial-gradient(circle, rgba(255,61,154,0.75) 0%, rgba(255,61,154,0.25) 45%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,226,90,0.8) 0%, rgba(255,190,40,0.28) 45%, transparent 70%)',
            }}
            animate={still ? undefined : { scale: [0.9, 1.12, 0.9], opacity: [0.75, 1, 0.75] }}
            transition={still ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {recommended && !still && (
          <>
            <style>{'@keyframes academy-twinkle { 0%,100% { transform: scale(.3) rotate(0deg); opacity: 0; } 50% { transform: scale(1) rotate(90deg); opacity: 1; } }'}</style>
            {TWINKLES.map((tw, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute z-10"
                style={{ left: `${tw.x}%`, top: `${tw.y}%`, width: tw.s * (big ? 1.5 : 1), height: tw.s * (big ? 1.5 : 1), animation: `academy-twinkle 1.8s ease-in-out ${tw.d}s infinite` }}
              >
                <svg viewBox="0 0 12 12" className="h-full w-full drop-shadow-[0_0_4px_rgba(255,230,120,0.95)]">
                  <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#fff6c2" />
                </svg>
              </span>
            ))}
          </>
        )}
        {isBoss && node.progress && locked && <BossRing have={node.progress.have} need={node.progress.need} size={size} />}
        <m.div
          className={cn('relative h-full w-full', isBoss && locked && 'p-[16%]')}
          animate={recommended && !still ? { y: [0, -6, 0] } : undefined}
          transition={recommended && !still ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          <span className="relative block h-full w-full">
            <Image
              src={ART[node.type]}
              alt=""
              aria-hidden="true"
              fill
              unoptimized
              sizes={`${size}px`}
              className={cn(
                'select-none object-contain drop-shadow-[3px_4px_0_rgba(0,0,0,0.75)]',
                locked && 'brightness-[.55] grayscale-[.85]',
                calm && 'brightness-[.92] saturate-[.8]',
                node.state === 'waiting' && 'brightness-[.8] saturate-[.55]',
              )}
              draggable={false}
            />
          </span>
        </m.div>

        {node.state === 'done' && (
          <span className="absolute -top-1 -end-1">
            <Medallion tone="lime" size={24} shadow={1}>
              <Flag className="h-3 w-3 fill-neo-black text-neo-black" />
            </Medallion>
          </span>
        )}
        {node.badge != null && (
          <span className="absolute -top-1 -end-1" aria-label={t('academy.student.reviewDueAria', '{count} words to review', { count: node.badge })}>
            <Medallion tone="pink" size={26} shadow={1}>
              <span className="font-neo-display text-xs font-black leading-none text-neo-white [text-shadow:0_1px_0_#000]">{node.badge}</span>
            </Medallion>
          </span>
        )}
        {node.state === 'waiting' && (
          <span className="absolute bottom-[8%] -start-1">
            <Medallion tone="night" size={24} shadow={1}>
              <Moon className="h-3 w-3 fill-neo-yellow text-neo-black" />
            </Medallion>
          </span>
        )}
        {isBoss && locked && (
          <>
            <Chains />
            <span className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="academy-boss-lock">
              <Medallion tone="gold" size={big ? 44 : 32} shadow={2}>
                <Lock className={big ? 'h-5 w-5 text-neo-black' : 'h-4 w-4 text-neo-black'} strokeWidth={3} />
              </Medallion>
            </span>
            {node.progress && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neo-yellow bg-neo-black/80 px-1.5 font-neo-display font-black leading-tight tabular-nums text-neo-yellow',
                  big ? 'text-xl' : 'text-sm',
                )}
                dir="ltr"
              >
                {node.progress.have}/{node.progress.need}
              </span>
            )}
          </>
        )}
        {node.state === 'live' && (
          <span
            className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-neo-black px-2 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white"
            style={toneStyle('pink', { shadow: 2, trim: 1 })}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neo-white" aria-hidden="true" />
            <span dir="auto">{t('academy.student.liveTag', 'Live')}</span>
          </span>
        )}

        {/* Tap sparkles */}
        <AnimatePresence>
          {burst > 0 &&
            SPARKS.map((deg) => (
              <m.span
                key={`${burst}-${deg}`}
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3"
                initial={{ x: '-50%', y: '-50%', scale: 0.4, opacity: 1 }}
                animate={{
                  x: `calc(-50% + ${Math.cos((deg * Math.PI) / 180) * size * 0.7}px)`,
                  y: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * size * 0.7}px)`,
                  scale: 1.1,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                <svg viewBox="0 0 12 12" className="h-full w-full">
                  <path d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z" fill="#fff3a0" stroke="#000" strokeWidth="1" />
                </svg>
              </m.span>
            ))}
        </AnimatePresence>
      </div>

      <span
        dir="auto"
        className={cn(
          'relative -mt-1 flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border-2 border-neo-black px-2 py-0.5 font-neo-display font-black leading-tight',
          plaqueSize,
          locked && 'opacity-90',
          dark ? `text-neo-white ${INK_TEXT}` : 'text-neo-black',
        )}
        style={toneStyle(plaqueTone, { shadow: 2, trim: 1.5 })}
      >
        <span className={isBoss ? 'shrink-0' : 'truncate'}>{label}</span>
        {chip && (
          <span className={cn('rounded-full px-1.5 tabular-nums', locked ? 'bg-neo-black/60 text-neo-yellow' : 'bg-neo-black text-neo-lime')}>
            {chip}
          </span>
        )}
      </span>
    </m.div>
    </span>
  );
}
