'use client';

/**
 * Adventure — world map → world levels → classic-board level (AdventureLevel).
 * Progress: GET /api/adventure/progress. Collection + skins: player_inventory.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Backpack, Trophy, Palette, Loader2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useAdventureInventory } from '@/hooks/useAdventureInventory';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { LEVELS_PER_WORLD, WORLD_COUNT } from '@/lib/adventure/play/levels';
import { canPlayLevel, totalStarsOf } from '@/lib/adventure/play/progress';
import { unlockedWorldSkins } from '@/lib/adventure/play/worldSkins';
import WorldMap from './WorldMap';
import LevelGrid from './LevelGrid';
import CollectionPanel from './CollectionPanel';
import AdventureLevel from './play/AdventureLevel';
import SkinVault from './play/SkinVault';
import { useAdventureProgress } from './play/useAdventureProgress';
import { equipWorldSkin, equippedWorld } from './play/equipWorldSkin';
import { readRun } from './play/runStorage';
import RunBanner from './play/run/RunBanner';

type View = { kind: 'map' } | { kind: 'world'; world: number } | { kind: 'play'; world: number; level: number };

export default function AdventureView() {
  const { t, language } = useLanguageSafe();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  // A session user is enough to play: the profile row can land later (or fail) — the APIs only need the session.
  const signedIn = isAuthenticated || !!user;
  const setInGame = useHideNavigation();
  const { completions, state, refresh } = useAdventureProgress(signedIn);
  const { inventory, refresh: refreshInventory } = useAdventureInventory();
  const { earnAchievement } = useAdventureAchievements();
  const [view, setView] = useState<View>({ kind: 'map' });
  const [panel, setPanel] = useState<'collection' | 'skins' | null>(null);
  const [skinWorld, setSkinWorld] = useState<number | null>(null);
  // Bumped on a run restart so the same level remounts fresh.
  const [runNonce, setRunNonce] = useState(0);

  useEffect(() => setSkinWorld(equippedWorld()), []);
  useEffect(() => {
    setInGame(view.kind === 'play');
    return () => setInGame(false);
  }, [view.kind, setInGame]);

  const totalStars = useMemo(() => totalStarsOf(completions), [completions]);
  const skins = useMemo(() => unlockedWorldSkins(inventory.map((i) => i.item_id)), [inventory]);
  const bossesBeaten = useMemo(
    () => inventory.filter((i) => /^boss-trophy-w\d+$/.test(i.item_id)).length,
    [inventory],
  );

  const onSaved = useCallback(() => {
    void refresh();
    void refreshInventory();
  }, [refresh, refreshInventory]);

  const equip = useCallback((world: number) => {
    equipWorldSkin(world, user?.id ?? null);
    setSkinWorld(world);
  }, [user?.id]);

  const nextOf = (world: number, level: number) =>
    level < LEVELS_PER_WORLD ? { world, level: level + 1 } : world < WORLD_COUNT ? { world: world + 1, level: 1 } : null;

  // Auth resolves after first paint (loading → user). Hold a loader until it does,
  // or a signed-in player sees the sign-in wall flash (or stick) on a hard load.
  if (!signedIn && authLoading) {
    return (
      <div data-testid="adventure-auth-pending" className="min-h-dvh grid place-items-center bg-[#0f1b3d] text-neo-cream">
        <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 bg-[#0f1b3d] text-neo-cream text-center">
        <div className="max-w-sm">
          <p className="font-neo-display text-2xl font-bold">{t('adventurePlay.signInRequired')}</p>
          <Link href={`/${language}`} className="mt-4 inline-block rounded-xl border-[3px] border-black bg-neo-lime text-black font-bold px-5 py-2.5 shadow-[3px_3px_0_#000]">
            {t('adventurePlay.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (view.kind === 'play') {
    // A win is what unlocks `next`, and /start re-checks it server-side.
    const next = nextOf(view.world, view.level);
    return (
      <AdventureLevel
        key={`${view.world}-${view.level}-${runNonce}`}
        world={view.world}
        level={view.level}
        hasNext={!!next}
        onExit={() => setView({ kind: 'world', world: view.world })}
        onNext={() => next && setView({ kind: 'play', ...next })}
        onRestartRun={() => { setRunNonce((n) => n + 1); setView({ kind: 'play', world: view.world, level: 1 }); }}
        onSaved={onSaved}
        onEquipSkin={equip}
        earnAchievement={earnAchievement}
        totalBossesBeaten={bossesBeaten}
        otherPerfectLevels={completions.filter((c) => c.stars === 3 && !(c.world === view.world && c.level === view.level)).length}
      />
    );
  }

  const worldCfg = view.kind === 'world' ? getWorldConfig(view.world) : null;
  // sessionStorage: read on render of the world view only (client component, guarded in readRun).
  const activeRun = view.kind === 'world' ? readRun(view.world)?.run ?? null : null;

  return (
    <div className="min-h-dvh bg-[#0f1b3d] text-neo-cream">
      <header className="sticky top-0 z-40 flex items-center gap-1.5 px-3 py-2.5 bg-[#0f1b3d]/90 backdrop-blur-sm border-b-[3px] border-black">
        {view.kind === 'world' ? (
          <button type="button" onClick={() => setView({ kind: 'map' })} aria-label={t('adventurePlay.backToMap')}
            className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000]">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
        ) : (
          <Link href={`/${language}`} aria-label={t('adventurePlay.backHome')}
            className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000]">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
        )}
        <h1 className="flex-1 min-w-0 font-neo-display text-lg font-bold truncate">
          {worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : t('adventurePlay.title')}
        </h1>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-black bg-neo-yellow text-black px-2 py-1 font-bold tabular-nums text-sm">
          <Star className="w-4 h-4 fill-black" /> {totalStars}
        </span>
        <button type="button" onClick={() => setPanel('skins')} aria-label={t('adventurePlay.skinVault')}
          className="relative rounded-xl border-[3px] border-black bg-neo-pink text-black p-1.5 shadow-[3px_3px_0_#000]">
          <Palette className="w-5 h-5" />
          {skins.size > 0 && <span className="absolute -top-2 -end-2 min-w-5 h-5 px-1 rounded-full bg-neo-lime border-2 border-black text-[10px] font-bold grid place-items-center">{skins.size}</span>}
        </button>
        <button type="button" onClick={() => setPanel('collection')} aria-label={t('adventure.collection.title')}
          className="rounded-xl border-[3px] border-black bg-neo-cyan text-black p-1.5 shadow-[3px_3px_0_#000]">
          <Backpack className="w-5 h-5" />
        </button>
        <Link href={`/${language}/adventure/achievements`} aria-label={t('adventurePlay.achievements')}
          className="rounded-xl border-[3px] border-black bg-neo-lime text-black p-1.5 shadow-[3px_3px_0_#000]">
          <Trophy className="w-5 h-5" />
        </Link>
      </header>

      {state === 'loading' ? (
        <div className="grid place-items-center py-24"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : state === 'error' ? (
        <div className="p-8 text-center">
          <p className="font-bold">{t('adventurePlay.loadError')}</p>
          <button type="button" onClick={() => void refresh()} className="mt-3 rounded-xl border-[3px] border-black bg-neo-cyan text-black font-bold px-4 py-2">{t('adventurePlay.tryAgain')}</button>
        </div>
      ) : view.kind === 'world' && worldCfg ? (
        <>
        {activeRun && activeRun.step > 1 && (
          <RunBanner run={activeRun} onContinue={() => setView({ kind: 'play', world: view.world, level: activeRun.step })} />
        )}
        <LevelGrid
          world={worldCfg}
          completions={completions}
          totalStars={totalStars}
          onLevelSelect={(world, level) => canPlayLevel(completions, world, level) && setView({ kind: 'play', world, level })}
        />
        </>
      ) : (
        <WorldMap
          totalStars={totalStars}
          completions={completions}
          onWorldSelect={(world) => setView({ kind: 'world', world })}
          onContinue={(world, level) => setView({ kind: 'play', world, level })}
        />
      )}

      <CollectionPanel isOpen={panel === 'collection'} onClose={() => setPanel(null)} inventory={inventory} />
      <SkinVault isOpen={panel === 'skins'} onClose={() => setPanel(null)} unlocked={skins} equippedWorld={skinWorld} onEquip={equip} />
    </div>
  );
}

