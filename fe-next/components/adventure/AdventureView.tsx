'use client';

/**
 * Adventure — world map → RUN. Picking a world opens its act map (a branching
 * roguelike run built from the run seed); every board is a node on that map, so
 * there is no level grid any more: the map IS the level select.
 * Progress: GET /api/adventure/progress. Collection + skins: player_inventory.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Star, Backpack, Trophy, Palette, Loader2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useAdventureInventory } from '@/hooks/useAdventureInventory';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import { WORLD_COUNT } from '@/lib/adventure/play/levels';
import { totalStarsOf } from '@/lib/adventure/play/progress';
import { unlockedWorldSkins } from '@/lib/adventure/play/worldSkins';
import WorldMap from './WorldMap';
import CollectionPanel from './CollectionPanel';
import AdventureLevel from './play/AdventureLevel';
import SkinVault from './play/SkinVault';
import { useAdventureProgress } from './play/useAdventureProgress';
import { equipWorldSkin, equippedWorld } from './play/equipWorldSkin';
import { AdventureGuestGate } from './AdventureGuestGate';

/**
 * QA-only: `?preview=win` / `?preview=over` mount the run-END screens with a
 * fabricated result. Reaching the real victory screen means clearing eight map
 * rows against the live API, so without this the win state cannot be
 * screenshotted or reviewed at all. Lazily loaded: no flag, no bundle.
 */
const RunResultPreview = dynamic(() => import('./play/run/RunResultPreview'), { ssr: false });

/** The world map, or one world's run (which opens on its act map). */
type View = { kind: 'map' } | { kind: 'run'; world: number };

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
  const [preview, setPreview] = useState<'win' | 'over' | null>(null);

  useEffect(() => setSkinWorld(equippedWorld()), []);
  // Deep link from the homepage "continue your run" cube: `?world=N` opens that
  // world's run straight away (the act map resumes the stored run) instead of
  // the world map. Read from `location` rather than `useSearchParams` so this
  // page needs no Suspense boundary.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const w = Number(params.get('world'));
      if (Number.isInteger(w) && w >= 1 && w <= WORLD_COUNT) setView({ kind: 'run', world: w });
      const p = params.get('preview');
      if (p === 'win' || p === 'over') setPreview(p);
    } catch { /* no query string, no deep link */ }
  }, []);
  useEffect(() => {
    setInGame(view.kind === 'run');
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

  // QA preview: fabricated client-side data only, so it runs ahead of the auth
  // wall — the win screen has to be reviewable without an eight-row live run.
  if (preview) {
    const world = view.kind === 'run' ? view.world : 1;
    const hp = Number(new URLSearchParams(window.location.search).get('hp'));
    return <RunResultPreview world={world} won={preview === 'win'} hp={Number.isFinite(hp) && hp > 0 ? hp : undefined} onExit={() => setPreview(null)} onEquipSkin={equip} />;
  }

  // Auth resolves after first paint (loading → user). Hold a loader until it does,
  // or a signed-in player sees the sign-in wall flash (or stick) on a hard load.
  if (!signedIn && authLoading) {
    return (
      <div data-testid="adventure-auth-pending" className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#0f1b3d] text-neo-cream px-4">
        <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
        <Link href={`/${language}`} data-testid="adventure-auth-pending-home" aria-label={t('adventurePlay.backHome')}
          className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000]">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
      </div>
    );
  }

  if (!signedIn) {
    return <AdventureGuestGate surface="map" />;
  }

  if (view.kind === 'run') {
    // One run per world: the act map decides which board is played, so the level
    // prop is only the fallback the map never uses.
    return (
      <AdventureLevel
        key={`run-${view.world}-${runNonce}`}
        mapFirst
        world={view.world}
        level={1}
        hasNext={view.world < WORLD_COUNT}
        onExit={() => setView({ kind: 'map' })}
        onNext={() => setView({ kind: 'run', world: Math.min(WORLD_COUNT, view.world + 1) })}
        onRestartRun={() => setRunNonce((n) => n + 1)}
        onSaved={onSaved}
        onEquipSkin={equip}
        earnAchievement={earnAchievement}
        totalBossesBeaten={bossesBeaten}
        otherPerfectLevels={completions.filter((c) => c.stars === 3).length}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#0f1b3d] text-neo-cream">
      <header className="sticky top-0 z-40 flex items-center gap-1.5 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] bg-[#0f1b3d]/90 backdrop-blur-sm border-b-[3px] border-black">
        <Link href={`/${language}`} aria-label={t('adventurePlay.backHome')}
          className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000]">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <h1 className="flex-1 min-w-0 font-neo-display text-lg font-bold truncate">{t('adventurePlay.title')}</h1>
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
      ) : (
        <WorldMap
          totalStars={totalStars}
          completions={completions}
          onWorldSelect={(world) => setView({ kind: 'run', world })}
          onContinue={(world) => setView({ kind: 'run', world })}
        />
      )}

      <CollectionPanel isOpen={panel === 'collection'} onClose={() => setPanel(null)} inventory={inventory} />
      <SkinVault isOpen={panel === 'skins'} onClose={() => setPanel(null)} unlocked={skins} equippedWorld={skinWorld} onEquip={equip} />
    </div>
  );
}

