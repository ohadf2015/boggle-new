'use client';

/**
 * The act map — the screen a run is chosen on. Eight rows read bottom-to-top,
 * the boss pinned at the top as the goal, the run (hearts / gold / relics)
 * pinned at the top as the stake, and only the nodes you can actually walk to
 * lit up. Everything else is dimmed, so the choice is the loudest thing here.
 *
 * Geometry lives in `mapLayout` (pure, tested). Nodes and the edge SVG share
 * ONE physical coordinate space (x = % of width, y = px) so the lines stay
 * attached to the badges in Hebrew too — a vertical map is never mirrored.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Play, ListTree } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { BOSS_ROW, type RunMap } from '@/lib/adventure/play/runMap';
import { Hearts } from '../play/RunHud';
import RelicBar from '../play/run/RelicBar';
import GoldCounter from '../play/run/GoldCounter';
import MapNodeButton from './MapNodeButton';
import MapLegend from './MapLegend';
import MapRunRail from './MapRunRail';
import MapGoalRail from './MapGoalRail';
import { useSurfaceWidth } from './useSurfaceWidth';
import {
  layoutMap, edgeLines, nodeStatuses, pendingFight, walkedEdges, mapHeight, edgeKey, mapScale,
} from './mapLayout';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  map: RunMap;
  run: PublicRun | null;
  currentNode: string | null;
  reachable: readonly string[];
  /** Nodes this run has actually played out (see `clearedNodes`). */
  cleared: readonly string[];
  onChoose: (id: string) => void;
  onLeave: () => void;
  /**
   * The run is over: the map becomes a recap of the path walked — nothing is
   * tappable, and the footer offers a new run instead of a next node.
   */
  recap?: boolean;
  onNewRun?: () => void;
  /**
   * A node screen (shop / campfire / chest / event) is open ON TOP of the map.
   * The map stays painted underneath, but it must stop being reachable: without
   * this, every node button behind the shop was still in the tab order and in
   * the a11y tree, so a keyboard or screen-reader player could walk the run
   * from under an overlay.
   */
  covered?: boolean;
}

export default function RunMapScreen({ world, map, run, currentNode, reachable, cleared, onChoose, onLeave, recap, onNewRun, covered }: Props) {
  const { t, language } = useLanguageSafe();
  const sfx = useSoundEffects();
  const [legend, setLegend] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const worldCfg = getWorldConfig(world);
  const boss = getBossConfig(world);

  // The map sizes itself off the SURFACE, measured before paint: a phone gets a
  // narrow column, a TV gets a wider lattice with bigger nodes and side rails —
  // never the same 390px column re-centred in 1280px of navy.
  const surface = useSurfaceWidth<HTMLDivElement>();
  const scale = mapScale(surface.width);

  const laid = useMemo(() => layoutMap(map, scale), [map, scale]);
  const lines = useMemo(() => edgeLines(map, laid), [map, laid]);
  const path = useMemo(() => run?.path ?? [], [run]);
  // A recap walks nothing forward: every node freezes where the run left it.
  const blocked = useMemo(() => !!recap || pendingFight(map, currentNode, cleared), [recap, map, currentNode, cleared]);
  const statuses = useMemo(
    () => nodeStatuses({ map, path, currentNode, reachable, blocked }),
    [map, path, currentNode, reachable, blocked],
  );
  const walked = useMemo(() => walkedEdges(path), [path]);
  const openEdges = useMemo(
    () => new Set(blocked ? [] : reachable.map((to) => `${currentNode ?? ''}->${to}`)),
    [blocked, reachable, currentNode],
  );
  const resumable = blocked && !recap;
  const stepOf = useMemo(() => new Map(path.map((id, i) => [id, i + 1])), [path]);
  const height = mapHeight(map.rows, scale);

  // Open the map at the player's position (bottom on a fresh run), never at the top.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const here = laid.find((n) => n.node.id === currentNode) ?? laid.find((n) => n.node.row === 0);
    box.scrollTop = Math.max(0, (here ? here.y : height) - box.clientHeight * 0.62);
  }, [currentNode, laid, height]);

  const choose = (id: string) => {
    sfx.playButtonClickSound?.();
    onChoose(id);
  };

  return (
    <div ref={surface.ref} className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#0f1b3d] text-neo-cream" data-testid="run-map" data-scale={scale.node} inert={covered || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop */}
      <img src={`/images/adventure/play/world-${world}.webp`} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,40,0.92)_0%,rgba(10,16,40,0.72)_45%,rgba(10,16,40,0.95)_100%)]" />

      {/* --- Run state, pinned: who you are before you choose where to go. */}
      <header className="relative z-20 shrink-0 border-b-[3px] border-black bg-[#0f1b3d]/95 px-3 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))]">
        {/* `pe-11` keeps the app's floating audio button off the gold counter. */}
        <div className="flex items-center gap-2 pe-11">
          <button type="button" onClick={onLeave} aria-label={t('adventurePlay.map.leave')}
            className="rounded-xl border-[3px] border-black bg-neo-cream p-2 text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          {/* Straight home: the run is kept (localStorage run token), so this loses nothing. */}
          <Link href={`/${language}`} aria-label={t('adventurePlay.backHome')}
            className="rounded-xl border-[3px] border-black bg-neo-cream p-2 text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
            <Home className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-neo-display text-base font-bold leading-tight">
              {worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : t('adventurePlay.title')}
            </div>
            <div className="text-[11px] uppercase tracking-wider opacity-80 tabular-nums">
              {t('adventurePlay.map.floorOf', { step: Math.max(1, path.length), total: map.rows })}
            </div>
          </div>
          {!scale.rails && <Hearts hp={run?.hp ?? 0} maxHp={run?.maxHp ?? 0} />}
          {!scale.rails && <GoldCounter value={run?.gold ?? 0} />}
        </div>
        {!scale.rails && (
          <div className="mt-1 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <RelicBar relics={run?.relics ?? []} size="sm" runCtx={{ world: run?.w, step: run?.step }} />
            </div>
            <button type="button" onClick={() => setLegend(true)}
              className="mb-2 inline-flex shrink-0 items-center gap-1 rounded-lg border-[3px] border-black bg-neo-cyan px-2 py-1 text-xs font-bold text-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none">
              <ListTree className="w-4 h-4" aria-hidden /> {t('adventurePlay.map.legend')}
            </button>
          </div>
        )}
      </header>

      {/* --- The goal, always on screen even when the boss row is scrolled away.
              Past 768px it is a card in the right rail instead of a banner that
              costs every screen a row of height and fills none of the margin. */}
      {!scale.rails && (
        <div className="relative z-20 shrink-0 border-b-[3px] border-black bg-neo-red/90 px-3 py-1.5">
          <div className="flex items-center gap-2">
            {boss && (
              // eslint-disable-next-line @next/next/no-img-element -- static boss portrait
              <img src={boss.images.idle} alt="" aria-hidden className="h-8 w-8 rounded-md border-2 border-black bg-black/30 object-contain" />
            )}
            <span className="truncate font-neo-display text-sm font-bold">
              {t('adventurePlay.map.bossAhead', { name: boss ? t(boss.displayName) : t('adventurePlay.map.kind.boss') })}
            </span>
            <span className="ms-auto shrink-0 rounded-md border-2 border-black bg-black/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tabular-nums">
              {t('adventurePlay.map.depth', { step: BOSS_ROW + 1 })}
            </span>
          </div>
        </div>
      )}

      {/* --- The map itself, flanked by the rails on anything wider than a phone. */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {scale.rails && <MapRunRail run={run} step={Math.max(1, path.length)} total={map.rows} />}
        <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        <div className="relative mx-auto w-full" style={{ height, maxWidth: scale.maxW }}>
          <svg className="absolute inset-0 h-full w-full" width="100%" height={height} aria-hidden focusable="false">
            {lines.map((line) => {
              const key = edgeKey(line);
              const isWalked = walked.has(key);
              const isOpen = openEdges.has(key);
              return (
                <line
                  key={key}
                  x1={`${line.x1}%`} y1={line.y1} x2={`${line.x2}%`} y2={line.y2}
                  stroke={isWalked ? '#FDF6E3' : isOpen ? '#C6F432' : 'rgba(253,246,227,0.18)'}
                  strokeWidth={isWalked || isOpen ? 4 : 3}
                  strokeLinecap="round"
                  strokeDasharray={isWalked ? undefined : '2 10'}
                />
              );
            })}
          </svg>
          {laid.map(({ node, x, y }) => (
            <MapNodeButton
              key={node.id}
              node={node} x={x} y={y}
              status={statuses[node.id]}
              world={world}
              step={stepOf.get(node.id)}
              resumable={resumable && node.id === currentNode}
              tier={scale.node}
              onSelect={choose}
            />
          ))}
        </div>
        </div>
        {scale.rails && <MapGoalRail world={world} onLegend={() => setLegend(true)} />}
      </div>

      {/* --- What to do now. */}
      <div className="relative z-20 shrink-0 border-t-[3px] border-black bg-[#0f1b3d]/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {recap ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate font-neo-display text-sm font-bold uppercase tracking-wide">
              {t('adventurePlay.map.pathTaken')}
            </span>
            {onNewRun && (
              <button type="button" onClick={onNewRun} data-testid="map-new-run"
                className="rounded-xl border-[3px] border-black bg-neo-lime px-3 py-2 font-neo-display text-sm font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none">
                {t('adventurePlay.map.newRun')}
              </button>
            )}
            <button type="button" onClick={onLeave}
              className="rounded-xl border-[3px] border-black bg-neo-cream px-3 py-2 font-neo-display text-sm font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none">
              {t('adventurePlay.map.leave')}
            </button>
          </div>
        ) : blocked && currentNode ? (
          <button type="button" onClick={() => choose(currentNode)} data-testid="map-resume"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-neo-lime px-4 py-2.5 font-neo-display text-base font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none">
            <Play className="w-5 h-5 rtl:rotate-180" aria-hidden /> {t('adventurePlay.map.resumeFight')}
          </button>
        ) : (
          <p className={cn('text-center font-neo-display text-sm font-bold uppercase tracking-wide')}>
            {t('adventurePlay.map.chooseNext')}
          </p>
        )}
      </div>

      <MapLegend open={legend} onClose={() => setLegend(false)} />
    </div>
  );
}
