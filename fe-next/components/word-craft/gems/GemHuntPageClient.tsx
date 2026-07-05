'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { ArrowLeft, Gem as GemLucide } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useGemHunt } from '@/lib/word-craft/gems/useGemHunt';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { WordCraftBoard } from '@/components/word-craft/WordCraftBoard';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { GemHuntHUD } from './GemHuntHUD';
import { GemInventory } from './GemInventory';
import { GemShop } from './GemShop';
import { GemCellOverlay } from './GemCellOverlay';
import { WordCraftScorePreviewBadge } from '@/components/word-craft/WordCraftScorePreviewBadge';
import { GemHuntWinScene } from './GemHuntWinScene';
import { cn } from '@/lib/utils';
import type { AbilityCard, AbilityKind } from '@/lib/word-craft/gems/types';
import { planGemDrama, clampGemDramaForCosy } from '@/lib/word-craft/celebration/gemDrama';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useMusic } from '@/contexts/MusicContext';
import type { SoundEffectKey } from '@/lib/audio/soundEffectsConfig';

export default function GemHuntPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const locale = (language ?? 'en') as SupportedLocale;

  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadWordCraftDictionary(locale).then((d) => {
      if (!cancelled) setDict(d);
    }).catch(() => {
      if (!cancelled) setDict(new Set());
    });
    return () => { cancelled = true; };
  }, [locale]);

  const [seed] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const fromUrl = new URLSearchParams(window.location.search).get('seed');
    return fromUrl ? Number(fromUrl) : Math.floor(Math.random() * 1_000_000);
  });

  const hunt = useGemHunt({ seed, dict, locale, boardSize: 11 });
  const { state } = hunt;
  const { cosyMode } = useAccessibility();

  // Audio: Gem Hunt was fully silent — no music, no collect rings, no win sting.
  const { playSound, setGameActive } = useSoundEffects();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  useEffect(() => {
    setGameActive(true);
    fadeToTrack(TRACKS.IN_GAME, 600, 600);
    return () => {
      setGameActive(false);
      stopMusic(500);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Win / loss sting (drama.soundKey handles per-gem collect rings below).
  const prevOutcomeRef = useRef<typeof state.outcome>(null);
  useEffect(() => {
    if (state.outcome && state.outcome !== prevOutcomeRef.current) {
      playSound(state.outcome === 'won' ? 'crownVictory' : 'defeatSting', { requiresGameActive: false });
      stopMusic(500);
    }
    prevOutcomeRef.current = state.outcome;
  }, [state.outcome, playSound, stopMusic]);

  // GSAP collect burst: when state.lastCollection updates, fly each collected
  // gem's icon from its board cell to its matching inventory chip. Clone the
  // node so the original (now off-board) doesn't disrupt React's children.
  const lastBurstTurnRef = useRef<number>(-1);
  useEffect(() => {
    if (!state.lastCollection.length) return;
    if (state.turnIndex === lastBurstTurnRef.current) return;
    lastBurstTurnRef.current = state.turnIndex;
    for (const gem of state.lastCollection) {
      const sourceEl = document.querySelector<HTMLElement>(`[data-gem-id="${gem.cellId}"]`);
      const targetEl = document.querySelector<HTMLElement>(`[data-inv-cell="${gem.color}-${gem.rarity}"]`);
      if (!sourceEl || !targetEl) continue;
      // Rarity drama: shards pulse, crowns trigger the fullscreen celebration
      // burst at the inventory chip + brief board freeze-frame. Cosy clamps
      // the crown down to a shard-equivalent (no freeze, sparkle only).
      const dramaRaw = planGemDrama({ rarity: gem.rarity });
      const drama = cosyMode ? clampGemDramaForCosy(dramaRaw) : dramaRaw;
      // Rarity-scaled collect ring — the gemDrama plan already names the key
      // (coinCollect for shards, achievement for crowns); it was never played.
      if (drama.soundKey) playSound(drama.soundKey as SoundEffectKey, {});
      if (drama.sharedFxPreset && SharedFxApp.isInitialized()) {
        const dstCenter = targetEl.getBoundingClientRect();
        SharedFxApp.spawnBurst(
          drama.sharedFxPreset,
          dstCenter.left + dstCenter.width / 2,
          dstCenter.top + dstCenter.height / 2,
        );
      }
      if (drama.freezeFrameMs > 0) {
        const board = document.querySelector<HTMLElement>('[data-wc-board]');
        if (board) {
          board.style.filter = 'brightness(1.25) saturate(1.4)';
          setTimeout(() => {
            if (board) board.style.filter = '';
          }, drama.freezeFrameMs);
        }
      }
      const srcRect = sourceEl.getBoundingClientRect();
      const dstRect = targetEl.getBoundingClientRect();
      const clone = sourceEl.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = `${srcRect.left}px`;
      clone.style.top = `${srcRect.top}px`;
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);
      const dx = dstRect.left + dstRect.width / 2 - (srcRect.left + srcRect.width / 2);
      const dy = dstRect.top + dstRect.height / 2 - (srcRect.top + srcRect.height / 2);
      gsap.to(clone, {
        x: dx,
        y: dy,
        scale: 0.6,
        rotation: 360,
        duration: 0.62,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(clone, {
            scale: 0,
            opacity: 0,
            duration: 0.18,
            ease: 'back.in(2)',
            onComplete: () => clone.remove(),
          });
        },
      });
    }
  }, [state.lastCollection, state.turnIndex, cosyMode, playSound]);

  const tilesRemaining = state.bag.tiles.length;

  // Build the i18n bundle once per locale.
  const abilityName: Record<AbilityKind, string> = {
    portal: t('wordcraft.gems.ability.portal.name'),
    joker: t('wordcraft.gems.ability.joker.name'),
    reroll: t('wordcraft.gems.ability.reroll.name'),
  };
  const abilityDesc: Record<AbilityKind, string> = {
    portal: t('wordcraft.gems.ability.portal.desc'),
    joker: t('wordcraft.gems.ability.joker.desc'),
    reroll: t('wordcraft.gems.ability.reroll.desc'),
  };

  const pendingPlacementSet = useMemo(
    () => new Set(state.pendingPlacements.map((p) => p.rackTileId)),
    [state.pendingPlacements],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => hunt.placeOnBoard(row, col),
    [hunt],
  );

  const handleRecallPending = useCallback(
    (rackTileId: string) => hunt.recallTile(rackTileId),
    [hunt],
  );

  // Card-pull fanfare: when a shop card is bought, fire a sparkle stream
  // from the card to the gem chip it spent. Sells the "this is a moment"
  // beat that the silent state-update used to miss. Skipped under cosy.
  const handleBuyAbility = useCallback(
    (card: AbilityCard) => {
      const result = hunt.buyAbility(card);
      if (!cosyMode && SharedFxApp.isInitialized()) {
        const cardEl = document.querySelector<HTMLElement>(`[data-shop-card="${card.id}"]`);
        const chipEl = document.querySelector<HTMLElement>(
          `[data-inv-cell="${card.cost.color}-${card.cost.rarity}"]`,
        );
        if (cardEl) {
          const r = cardEl.getBoundingClientRect();
          SharedFxApp.spawnBurst('sparkle-gold', r.left + r.width / 2, r.top + r.height / 2);
        }
        if (chipEl) {
          const r = chipEl.getBoundingClientRect();
          SharedFxApp.spawnBurst('sparkle', r.left + r.width / 2, r.top + r.height / 2);
        }
      }
      return result;
    },
    [hunt, cosyMode],
  );

  const handleSubmit = useCallback(() => hunt.submitMove(), [hunt]);
  const handleRecallAll = useCallback(() => hunt.recallAll(), [hunt]);
  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  const errorMessage = (() => {
    const e = state.lastError;
    if (!e) return null;
    if (e === 'DICT_LOADING') return t('wordcraft.error.dictLoading');
    if (e === 'INSUFFICIENT_GEMS') return t('wordcraft.gems.error.insufficientGems');
    if (e === 'CANNOT_TRANSMUTE') return t('wordcraft.gems.error.cannotTransmute');
    if (e.startsWith('INVALID_WORD:')) return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) });
    if (e === 'FIRST_MOVE_MUST_COVER_CENTER') return t('wordcraft.error.mustCoverCenter');
    if (e === 'FIRST_MOVE_TOO_SHORT') return t('wordcraft.error.tooShort');
    if (e === 'NOT_LINEAR') return t('wordcraft.error.notLinear');
    if (e === 'NOT_CONTIGUOUS') return t('wordcraft.error.notContiguous');
    if (e === 'DISCONNECTED') return t('wordcraft.error.disconnected');
    if (e === 'OUT_OF_BOUNDS') return t('wordcraft.error.outOfBounds');
    return e;
  })();

  return (
    <div
      className={cn(
        'flex flex-col w-full h-svh overflow-hidden relative',
        'bg-neo-navy texture-halftone',
        isRTL && 'rtl',
      )}
      translate="no"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-neo-cyan/15 via-neo-yellow/8 to-transparent"
      />
      <Header />

      <main className="flex-1 min-h-0 px-2 py-1 max-w-[820px] mx-auto w-full flex flex-col gap-1.5 relative">
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${language}`)} aria-label={t('common.back')} className="shrink-0 h-8 px-2">
            <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
          </Button>
          <span aria-hidden className="inline-flex items-center justify-center w-7 h-7 rounded-neo bg-neo-cyan text-neo-navy border-2 border-black shadow-hard-sm rotate-[-4deg]">
            <GemLucide className="w-4 h-4" />
          </span>
          <h1 className="text-lg font-neo-display font-black text-neo-white tracking-tight">
            {t('wordcraft.gems.title')}
          </h1>
        </div>

        {!dict ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-neo-navy-light border-2 border-black rounded-neo shrink-0">
            <PageLoader size="sm" />
            <span className="text-xs text-neo-white">{t('wordcraft.loadingDict')}</span>
          </div>
        ) : null}

        <GemHuntHUD
          inventory={state.inventory}
          totalScore={state.totalScore}
          tilesRemaining={tilesRemaining}
          turnIndex={state.turnIndex}
          labels={{
            crownsWon: t('wordcraft.gems.hud.crownsWon'),
            score: t('wordcraft.gems.hud.score'),
            bagRemaining: t('wordcraft.bagRemaining'),
            turn: t('wordcraft.gems.hud.turn'),
          }}
        />

        <GemShop
          shop={state.shop}
          inventory={state.inventory}
          pendingAbilities={state.pendingAbilities}
          onBuy={handleBuyAbility}
          onReroll={hunt.rerollShop}
          labels={{
            title: t('wordcraft.gems.shop.title'),
            cost: t('wordcraft.gems.shop.cost'),
            insufficient: t('wordcraft.gems.shop.insufficient'),
            purchased: t('wordcraft.gems.shop.purchased'),
            abilityName,
            abilityDesc,
          }}
        />

        {/* Board with gem overlay */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center"
          style={{ containerType: 'size' }}
        >
          <div className="relative aspect-square" style={{ width: '100cqmin', height: '100cqmin' }}>
            <WordCraftBoard
              board={state.board}
              pendingPlacements={state.pendingPlacements}
              onCellClick={handleCellClick}
              onRecallPending={handleRecallPending}
              disabled={state.outcome !== null || !dict}
              hasSelectedTile={!!state.selectedRackTileId}
              isFirstMove={state.turnIndex === 0 && state.pendingPlacements.length === 0}
              locale={locale}
            />
            <GemCellOverlay gemCells={state.gemCells} />
            <WordCraftScorePreviewBadge board={state.board} placements={state.pendingPlacements} />
          </div>
        </div>

        <GemInventory
          inventory={state.inventory}
          onTransmute={hunt.transmuteGem}
          labels={{
            title: t('wordcraft.gems.inventory.title'),
            transmuteCta: t('wordcraft.gems.inventory.transmuteCta'),
            transmuteAria: t('wordcraft.gems.inventory.transmuteAria'),
            crownGoal: t('wordcraft.gems.inventory.crownGoal'),
          }}
        />

        <WordCraftRack
          tiles={state.rack}
          selectedId={state.selectedRackTileId}
          pendingIds={pendingPlacementSet}
          onSelect={hunt.selectRackTile}
          disabled={state.outcome !== null || !dict}
          ariaLabel={t('wordcraft.yourRack')}
          locale={locale}
        />

        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={state.pendingPlacements.length === 0 || !dict || state.outcome !== null}
            className="flex-1 rounded-neo border-neo-thick border-black bg-neo-lime px-3 py-2 font-neo-display text-sm font-black uppercase tracking-wider text-neo-navy shadow-hard disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 active:shadow-hard-pressed"
          >
            {t('wordcraft.submit')}
          </button>
          <button
            type="button"
            onClick={handleRecallAll}
            disabled={state.pendingPlacements.length === 0}
            className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-2 font-neo-display text-sm font-black uppercase tracking-wider text-neo-white shadow-hard disabled:opacity-50"
          >
            {t('wordcraft.recall')}
          </button>
        </div>
      </main>

      {errorMessage ? (
        <div
          role="alert"
          className="absolute left-1/2 -translate-x-1/2 top-[calc(72px+8px)] z-40 max-w-[90%] px-3 py-2 bg-neo-red/95 border-2 border-black text-white text-sm rounded-neo shadow-hard-lg font-neo-body"
        >
          {errorMessage}
        </div>
      ) : null}

      {state.outcome !== null ? (
        <GemHuntWinScene
          totalScore={state.totalScore}
          turnIndex={state.turnIndex}
          outcome={state.outcome}
          onRestart={handleRestart}
          labels={{
            titleWon: t('wordcraft.gems.win.titleWon'),
            titleLost: t('wordcraft.gems.win.titleLost'),
            subtitleWon: t('wordcraft.gems.win.subtitleWon'),
            subtitleLost: t('wordcraft.gems.win.subtitleLost'),
            score: t('wordcraft.gems.hud.score'),
            turns: t('wordcraft.gems.hud.turn'),
            restart: t('wordcraft.gems.win.restart'),
          }}
        />
      ) : null}
    </div>
  );
}
