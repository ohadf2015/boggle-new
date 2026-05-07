'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import { WordCraftBoard } from '@/components/word-craft/WordCraftBoard';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { WordCraftScoreboard } from '@/components/word-craft/WordCraftScoreboard';
import { WordCraftControls } from '@/components/word-craft/WordCraftControls';
import { WordCraftCelebration, type CelebrationKind } from '@/components/word-craft/WordCraftCelebration';
import { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice';
import { cn } from '@/lib/utils';

export default function WordCraftPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const isRTL = language === 'he';
  const [dict, setDict] = useState<Set<string> | null>(null);

  const seed = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const fromUrl = new URLSearchParams(window.location.search).get('seed');
    return fromUrl ? Number(fromUrl) : Math.floor(Math.random() * 1_000_000);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    import('an-array-of-english-words').then((mod) => {
      if (cancelled) return;
      const list = (mod.default ?? mod) as string[];
      setDict(new Set(list.map((w) => w.toUpperCase())));
    }).catch(() => {
      if (!cancelled) setDict(new Set());
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const game = useWordCraftGame({ seed, dict });
  const juice = useWordCraftJuice();

  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; burstId: number; origin?: { x: number; y: number } }>({
    kind: null,
    burstId: 0,
  });

  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set(game.state.pendingPlacements.map((p) => p.rackTileId));
    for (const p of game.state.pendingPlacements) {
      if (!prevPendingIdsRef.current.has(p.rackTileId)) {
        const el = document.querySelector(`[data-tile-id="${p.rackTileId}"]`);
        juice.tilePlace(el);
      }
    }
    prevPendingIdsRef.current = next;
  }, [game.state.pendingPlacements, juice]);

  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game.state.selectedRackTileId;
    if (id && id !== prevSelectedRef.current) {
      const el = document.querySelector(`[data-rack-tile-id="${id}"]`);
      juice.rackSelect(el);
    }
    prevSelectedRef.current = id;
  }, [game.state.selectedRackTileId, juice]);

  const prevHistoryLenRef = useRef(0);
  useEffect(() => {
    const len = game.state.history.length;
    if (len === prevHistoryLenRef.current) return;
    const newest = game.state.history[len - 1];
    prevHistoryLenRef.current = len;
    if (!newest || newest.score === 0) return;

    const popEl = document.querySelector(`[data-score-value="${newest.who}"]`);
    juice.scorePop(popEl, newest.score);

    const placedEls = newest.placedTileIds
      .map((id) => document.querySelector(`[data-tile-id="${id}"]`))
      .filter((n): n is Element => Boolean(n));

    if (newest.who === 'bot' && placedEls.length > 0) {
      juice.botReveal(placedEls);
    }

    const isBingo = newest.placedTileIds.length >= 7;
    if (isBingo || newest.score >= 50) {
      const target = (placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined) ?? null;
      const rect = target?.getBoundingClientRect();
      setCelebration((prev) => ({
        kind: 'bingo',
        burstId: prev.burstId + 1,
        origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
      }));
    }
  }, [game.state.history, juice]);

  useEffect(() => {
    if (game.state.turn === 'over') {
      setCelebration((prev) => ({ kind: 'gameOver', burstId: prev.burstId + 1 }));
    }
  }, [game.state.turn]);

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const e = game.state.lastError;
    if (!e || e === lastErrorRef.current) {
      lastErrorRef.current = e;
      return;
    }
    lastErrorRef.current = e;
    const cellEls = game.state.pendingPlacements
      .map((p) => document.querySelector(`[data-tile-id="${p.rackTileId}"]`))
      .filter((n): n is Element => Boolean(n));
    juice.invalidShake(cellEls);
  }, [game.state.lastError, game.state.pendingPlacements, juice]);

  const isProfileLoading = !authLoading && user && !profile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">{t('admin.accessRequired')}</h1>
          <p className="text-slate-400 mb-6">{t('admin.accessDenied')}</p>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const pendingIds = new Set(game.state.pendingPlacements.map((p) => p.rackTileId));
  const winner =
    game.state.player.score > game.state.bot.score
      ? t('wordcraft.you')
      : game.state.bot.score > game.state.player.score
        ? t('wordcraft.bot')
        : t('wordcraft.tied');

  const errorMessage = (() => {
    const e = game.state.lastError;
    if (!e) return null;
    if (e === 'DICT_LOADING') return t('wordcraft.error.dictLoading');
    if (e.startsWith('INVALID_WORD:')) {
      return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) });
    }
    if (e === 'FIRST_MOVE_MUST_COVER_CENTER') return t('wordcraft.error.mustCoverCenter');
    if (e === 'FIRST_MOVE_TOO_SHORT') return t('wordcraft.error.tooShort');
    if (e === 'NOT_LINEAR') return t('wordcraft.error.notLinear');
    if (e === 'NOT_CONTIGUOUS') return t('wordcraft.error.notContiguous');
    if (e === 'DISCONNECTED') return t('wordcraft.error.disconnected');
    if (e === 'OUT_OF_BOUNDS') return t('wordcraft.error.outOfBounds');
    if (e === 'NO_TILES') return t('wordcraft.error.noTiles');
    if (e === 'BAG_TOO_SMALL_TO_SWAP') return t('wordcraft.error.bagTooSmallToSwap');
    return e;
  })();

  return (
    <div className={cn('flex-1 flex flex-col w-full overflow-x-hidden min-h-screen bg-neo-navy', isRTL && 'rtl')}>
      <Header />
      <WordCraftCelebration kind={celebration.kind} burstId={celebration.burstId} origin={celebration.origin} />

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 pb-24 max-w-[820px] mx-auto w-full space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${language}/admin`)}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {t('common.backToHome')}
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-neo-display text-neo-white">{t('wordcraft.title')}</h1>
            <p className="text-xs text-slate-400">{t('wordcraft.adminBadge')}</p>
          </div>
        </div>

        {!dict ? (
          <div className="flex items-center gap-3 p-3 bg-neo-navy-light border-neo border-black rounded-neo">
            <PageLoader size="sm" />
            <span className="text-sm text-neo-cream">{t('wordcraft.loadingDict')}</span>
          </div>
        ) : null}

        <WordCraftScoreboard
          player={game.state.player}
          bot={game.state.bot}
          turn={game.state.turn}
          tilesRemaining={game.tilesRemaining}
          labels={{
            you: t('wordcraft.you'),
            bot: t('wordcraft.bot'),
            yourTurn: t('wordcraft.yourTurn'),
            botTurn: t('wordcraft.botTurn'),
            gameOver: t('wordcraft.gameOver'),
            bagRemaining: t('wordcraft.bagRemaining'),
          }}
        />

        <WordCraftBoard
          board={game.state.board}
          pendingPlacements={game.state.pendingPlacements}
          onCellClick={game.placeOnBoard}
          disabled={game.state.turn !== 'player'}
        />

        <WordCraftRack
          tiles={game.state.player.rack}
          selectedId={game.state.selectedRackTileId}
          pendingIds={pendingIds}
          onSelect={game.selectRackTile}
          disabled={game.state.turn !== 'player' || !dict}
          ariaLabel={t('wordcraft.yourRack')}
        />

        <WordCraftControls
          canSubmit={game.state.pendingPlacements.length > 0 && !!dict && game.state.turn === 'player'}
          canRecall={game.state.pendingPlacements.length > 0}
          canSwap={game.state.player.rack.length > 0 && game.state.turn === 'player'}
          disabled={game.state.turn !== 'player' || !dict}
          onSubmit={game.submitMove}
          onRecall={game.recallAll}
          onPass={game.pass}
          onSwap={() => {
            const toReturn = game.state.player.rack.filter((tile) => !pendingIds.has(tile.id));
            game.swap(toReturn);
          }}
          labels={{
            submit: t('wordcraft.submit'),
            recall: t('wordcraft.recall'),
            pass: t('wordcraft.pass'),
            swap: t('wordcraft.swap'),
          }}
        />

        {errorMessage ? (
          <div role="alert" className="px-3 py-2 bg-neo-red/20 border-neo border-neo-red text-neo-red text-sm rounded-neo">
            {errorMessage}
          </div>
        ) : null}

        {game.state.turn === 'over' ? (
          <div className="text-center py-4 bg-neo-navy-light border-neo border-black rounded-neo">
            <p className="text-lg font-neo-display text-neo-white">
              {t('wordcraft.winnerLabel', { name: winner })}
            </p>
          </div>
        ) : null}

        {game.state.history.length > 0 ? (
          <div className="text-xs text-neo-cream/70 space-y-1">
            <h2 className="font-neo-display uppercase tracking-wide text-neo-white">{t('wordcraft.history')}</h2>
            <ul className="space-y-1">
              {game.state.history.slice(-5).reverse().map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {h.who === 'player' ? t('wordcraft.you') : t('wordcraft.bot')}: {h.words.join(', ') || t('wordcraft.passed')}
                  </span>
                  <span className="text-neo-lime">+{h.score}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
