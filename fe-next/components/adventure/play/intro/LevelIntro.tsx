'use client';

/**
 * Pre-level screen, full-screen and opaque so the combat HUD is gone:
 *  - a world's first level opens with a chapter story beat (ChapterBeat);
 *  - then the rule beat, where the twist sentence is hero-sized and owns the
 *    screen (Balatro boss blind), with a looping demo of the mechanic under it.
 * Goal, clock and the world path sit small in a footer that arrives after
 * the sentence has landed.
 */
import { useState } from 'react';
import { Target, Timer, Swords } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { getPlayLevel, LEVELS_PER_WORLD, type PlayLevel } from '@/lib/adventure/play/levels';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import KindBadge, { ThreatPips } from '../variants/KindBadge';
import { KIND_META, levelThreat, ruleKeysOf } from '../variants/levelKinds';
import MechanicPreview from './MechanicPreview';
import './intro.css';
import ChapterBeat from './ChapterBeat';
import { introBeats, worldBackdrop } from './introBeats';

interface Props {
  world: number;
  level: number;
  lvl: PlayLevel;
  onBegin: () => void;
}

export const eliteArt = (world: number) => `/images/adventure/enemies/w${world}-idle.webp`;

export default function LevelIntro({ world, level, lvl, onBegin }: Props) {
  const beats = introBeats(lvl);
  const [beat, setBeat] = useState(0);
  const current = beats[beat] ?? 'rule';
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[#0f1b3d] text-neo-cream" role="dialog" aria-modal="true"
      aria-labelledby="level-intro-title" data-testid="level-intro" data-kind={lvl.kind} data-beat={current}>
      {current === 'chapter'
        ? <ChapterBeat world={world} onNext={() => setBeat((b) => b + 1)} />
        : <RuleBeat world={world} level={level} lvl={lvl} onBegin={onBegin} />}
    </div>
  );
}

function RuleBeat({ world, level, lvl, onBegin }: Props) {
  const { t } = useLanguageSafe();
  const reduced = usePrefersReducedMotion();
  const boss = lvl.isBoss ? getBossConfig(world) : null;
  const worldCfg = getWorldConfig(world);
  const combat = lvl.kind === 'elite' || lvl.kind === 'boss';
  const meta = KIND_META[lvl.kind];
  const threat = levelThreat(lvl);

  // Boss: its own rule sentence (combat piece) when it exists, else the generic boss rule.
  const bossRuleKey = `adventurePlay.combat.rule.w${world}`;
  const bossRule = boss ? t(bossRuleKey) : '';
  const keys = ruleKeysOf(lvl);
  const rule = boss && bossRule && bossRule !== bossRuleKey ? bossRule : t(keys.main);
  const tag = keys.isNew ? t('adventurePlay.variety.newRule') : boss ? t('adventurePlay.combat.ruleTag') : null;

  const goalValue = combat ? lvl.bossHp : lvl.kind === 'hunt' ? lvl.huntCount ?? 0 : lvl.stars[0];
  const goalLabel = combat ? t('adventurePlay.variety.goalDamage')
    : lvl.kind === 'hunt' ? t('adventurePlay.variety.goalHunt') : t('adventurePlay.variety.goalScore');
  const enemyName = combat ? (boss ? t(boss.displayName) : t(`adventurePlay.combat.elite.w${world}`)) : '';

  return (
    <div className="relative flex h-full flex-col">
      {/* The world's scene, pushed far back: a place, not a HUD. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- painted world scene */}
      <img src={worldBackdrop(world)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-[0.14]" />
      <div className="absolute inset-0" aria-hidden
        style={{ background: `radial-gradient(120% 55% at 50% 38%, ${meta.hex}33 0%, transparent 60%)` }} />

      {/* Top strip: where we are, small. */}
      {/* pe-14: the global mute button sits in the end corner (both directions). */}
      <div className="relative flex items-center justify-between gap-2 ps-4 pe-14 pt-4 text-xs font-bold uppercase tracking-wider text-neo-cream/70">
        <span className="truncate">{worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : ''}</span>
        <span className="shrink-0 tabular-nums">{t('adventurePlay.worldLevel', { world, level })}</span>
      </div>

      {/* Hero: kind, enemy (combat), and the one sentence. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="level-kind-banner inline-flex rounded-xl border-[3px] border-black bg-[#1a1a2e] px-3 py-2 shadow-[4px_4px_0_#000]">
          <KindBadge kind={lvl.kind} label={t(`adventurePlay.variety.kind.${lvl.kind}`)} size="lg" />
        </div>

        {combat && (
          <div className="relative h-36 w-full max-w-[300px] overflow-hidden rounded-xl border-[3px] border-black bg-black/50 shadow-[4px_4px_0_#000]">
            {boss && !reduced ? (
              <video src={`/videos/adventure/boss-w${world}.mp4`} poster={`/videos/adventure/boss-w${world}.webp`}
                autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- enemy portrait
              <img src={boss ? `/videos/adventure/boss-w${world}.webp` : eliteArt(world)} alt=""
                className={cn('absolute inset-0 h-full w-full', boss ? 'object-cover' : 'object-contain p-2 drop-shadow-[4px_4px_0_#000]')} />
            )}
            <span className="absolute bottom-1.5 inset-x-2 mx-auto w-fit max-w-full truncate rounded-lg border-[3px] border-black bg-neo-pink px-2.5 py-0.5 font-neo-display text-lg font-bold text-black">
              {enemyName}
            </span>
          </div>
        )}

        <div className="rule-hero w-full">
          {tag && (
            <span className="rule-tag inline-block rounded-md border-[3px] border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-bold uppercase tracking-widest text-black shadow-[3px_3px_0_#000]">
              {tag}
            </span>
          )}
          <h2 id="level-intro-title" data-testid="level-rule"
            className={cn('mt-3 font-neo-display font-bold leading-[1.08] text-neo-cream [text-shadow:3px_3px_0_#000]',
              combat ? 'text-[clamp(22px,6.4vw,32px)]' : 'text-[clamp(27px,8vw,42px)]')}>
            {rule}
          </h2>
          {keys.modifier && (
            <p className="mt-2 font-neo-display text-lg font-bold leading-snug text-neo-yellow [text-shadow:2px_2px_0_#000]" data-testid="level-modifier">{t(keys.modifier)}</p>
          )}
        </div>

        {!combat && <MechanicPreview kind={lvl.kind} big />}
      </div>

      {/* Footer: the numbers, small, after the sentence has landed. */}
      <div className="intro-foot relative px-4 pb-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="inline-flex flex-1 items-center gap-1.5 rounded-lg border-[3px] border-black bg-[#1a1a2e] px-2.5 py-1.5">
            {combat ? <Swords className="h-4 w-4 opacity-70" /> : <Target className="h-4 w-4 opacity-70" />}
            <span className="truncate text-neo-cream/70">{goalLabel}</span>
            <span className="ms-auto font-neo-display text-xl tabular-nums leading-none" style={{ color: meta.hex }} data-testid="level-goal">{goalValue}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border-[3px] border-black bg-[#1a1a2e] px-2.5 py-1.5">
            <Timer className="h-4 w-4 opacity-70" />
            <span className="font-neo-display text-xl tabular-nums leading-none">{t('adventurePlay.variety.secondsShort', { seconds: lvl.seconds })}</span>
          </span>
          <ThreatPips threat={threat} label={t('adventurePlay.variety.threat', { threat })} />
        </div>
        <WorldPath world={world} level={level} />
        <button type="button" onClick={onBegin} autoFocus
          className={cn('mt-4 w-full rounded-xl border-[3px] border-black py-3 font-neo-display text-xl font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none',
            combat ? 'bg-neo-pink' : 'bg-neo-lime')}>
          {combat ? t('adventurePlay.fight') : t('adventurePlay.start')}
        </button>
      </div>
    </div>
  );
}

function WorldPath({ world, level }: { world: number; level: number }) {
  const { t } = useLanguageSafe();
  return (
    <ol className="mt-3 flex items-center justify-between gap-0.5" aria-label={t('adventurePlay.variety.pathLabel', { level, total: LEVELS_PER_WORLD })}>
      {Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
        const n = i + 1;
        const k = getPlayLevel(world, n).kind;
        const here = n === level;
        return (
          <li key={n} className={cn('relative flex items-center', n < LEVELS_PER_WORLD && 'flex-1')}>
            <span className={cn(here ? 'scale-110' : n < level ? 'opacity-50' : 'opacity-80')}>
              <KindBadge kind={k} label={t(`adventurePlay.variety.kind.${k}`)} size={here || k === 'boss' ? 'md' : 'sm'} iconOnly />
            </span>
            {here && <span className="absolute -bottom-2 inset-x-0 mx-auto h-1.5 w-1.5 rounded-full bg-neo-cream" aria-hidden />}
            {n < LEVELS_PER_WORLD && <span className={cn('mx-0.5 h-[3px] flex-1 rounded', n < level ? 'bg-neo-lime' : 'bg-white/25')} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
