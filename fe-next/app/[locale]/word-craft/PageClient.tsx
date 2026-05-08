'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { isWordCraftBetaUser } from '@/lib/word-craft/betaAccess';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { WordCraftBoard } from '@/components/word-craft/WordCraftBoard';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { WordCraftScoreboard } from '@/components/word-craft/WordCraftScoreboard';
import { WordCraftControls } from '@/components/word-craft/WordCraftControls';
import { WordCraftCelebration, type CelebrationKind } from '@/components/word-craft/WordCraftCelebration';
import { HeatMeter } from '@/components/word-craft/HeatMeter';
import { ScoreFloat } from '@/components/word-craft/ScoreFloat';
import { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice';
import { useAchievementQueue } from '@/components/achievements';
import { cn } from '@/lib/utils';

const ENCOURAGEMENT_COUNT = 8;
const LINGUIST_STORAGE_KEY = 'wc_locales_played';

function getPlayedLocales(): Set<string> {
  try {
    const raw = localStorage.getItem(LINGUIST_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function recordLocale(locale: string) {
  try {
    const set = getPlayedLocales();
    set.add(locale);
    localStorage.setItem(LINGUIST_STORAGE_KEY, JSON.stringify([...set]));
    return set.size;
  } catch {
    return 0;
  }
}

export default function WordCraftPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const email = user?.email;
  const isRTL = language === 'he';
  const locale = (language ?? 'en') as SupportedLocale;

  const [dict, setDict] = useState<Set<string> | null>(null);
  const [boardSize, setBoardSize] = useState<13 | 15>(15);

  // Board size from viewport — computed once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBoardSize(window.innerWidth < 768 ? 13 : 15);
    }
  }, []);

  const isBetaUser = !authLoading && isWordCraftBetaUser(email);

  // Redirect non-beta users once auth resolves
  useEffect(() => {
    if (authLoading) return;
    if (!isBetaUser) {
      router.replace(`/${language}`);
    }
  }, [authLoading, isBetaUser, language, router]);

  // Load locale dictionary
  useEffect(() => {
    if (!isBetaUser) return;
    let cancelled = false;
    loadWordCraftDictionary(locale).then((d) => {
      if (!cancelled) setDict(d);
    }).catch(() => {
      if (!cancelled) setDict(new Set());
    });
    return () => { cancelled = true; };
  }, [isBetaUser, locale]);

  // Record locale for linguist achievement
  useEffect(() => {
    if (isBetaUser) recordLocale(locale);
  }, [isBetaUser, locale]);

  const seed = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const fromUrl = new URLSearchParams(window.location.search).get('seed');
    return fromUrl ? Number(fromUrl) : Math.floor(Math.random() * 1_000_000);
  }, []);

  const game = useWordCraftGame({ seed, dict, locale, boardSize });
  const juice = useWordCraftJuice();
  const { queueAchievement } = useAchievementQueue();

  // Celebrations
  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; burstId: number; origin?: { x: number; y: number } }>({
    kind: null,
    burstId: 0,
  });

  // Score float state
  const [scoreFloat, setScoreFloat] = useState<{ score: number; overdrive: boolean; isBingo: boolean; encouragement: string; key: number } | null>(null);

  // --- Juice: tile place ---
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

  // --- Juice: rack select ---
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game.state.selectedRackTileId;
    if (id && id !== prevSelectedRef.current) {
      const el = document.querySelector(`[data-rack-tile-id="${id}"]`);
      juice.rackSelect(el);
    }
    prevSelectedRef.current = id;
  }, [game.state.selectedRackTileId, juice]);

  // --- History: score float + celebrations + achievements ---
  const prevHistoryLenRef = useRef(0);
  const overdriveCountRef = useRef(0);
  const firstWordAchievedRef = useRef(false);

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

    if (newest.who === 'player') {
      const isBingo = newest.placedTileIds.length >= 7;
      const wasOverdrive = game.state.overdrive === false && newest.score > 0; // overdrive was cashed
      const encIdx = Math.floor(Math.random() * ENCOURAGEMENT_COUNT);
      const encouragement = t(`wordcraft.encouragement.${encIdx}`);

      setScoreFloat({ score: newest.score, overdrive: false, isBingo, encouragement, key: len });

      // Achievement: first word
      if (!firstWordAchievedRef.current) {
        firstWordAchievedRef.current = true;
        queueAchievement({ key: 'wordcraft_first_word', icon: '🎉' });
      }

      // Achievement: bingo
      if (isBingo) {
        queueAchievement({ key: 'wordcraft_bingo', icon: '⭐' });
        const target = (placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined) ?? null;
        const rect = target?.getBoundingClientRect();
        setCelebration((prev) => ({
          kind: 'bingo',
          burstId: prev.burstId + 1,
          origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
        }));
      }

      // Achievement: overdrive cashed (wasOverdrive means we just exited overdrive via a word)
      if (wasOverdrive) {
        queueAchievement({ key: 'wordcraft_overdrive_cash', icon: '🔥' });
        setScoreFloat((prev) => prev ? { ...prev, overdrive: true } : prev);
      }
    }
  }, [game.state.history, game.state.overdrive, juice, t, queueAchievement]);

  // --- Overdrive enter ---
  const prevOverdriveRef = useRef(false);
  useEffect(() => {
    const cur = game.state.overdrive;
    if (cur && !prevOverdriveRef.current) {
      overdriveCountRef.current++;
      setCelebration((prev) => ({
        kind: 'overdrive',
        burstId: prev.burstId + 1,
        origin: undefined,
      }));
      queueAchievement({ key: 'wordcraft_overdrive_enter', icon: '⚡' });

      if (overdriveCountRef.current >= 3) {
        queueAchievement({ key: 'wordcraft_heat_streak', icon: '🏆', count: overdriveCountRef.current });
      }
    }
    prevOverdriveRef.current = cur;
  }, [game.state.overdrive, queueAchievement]);

  // --- Burnout auto-skip after 1.5s ---
  const prevBurnoutRef = useRef(false);
  useEffect(() => {
    const cur = game.state.burnout;
    const wasAlreadyBurnt = prevBurnoutRef.current;
    prevBurnoutRef.current = cur;
    if (!cur || wasAlreadyBurnt) return;
    setCelebration((prev) => ({ kind: 'burnout', burstId: prev.burstId + 1 }));
    const timer = setTimeout(() => { game.burnoutSkip(); }, 1500);
    return () => clearTimeout(timer);
  }, [game, game.state.burnout, game.burnoutSkip]);

  // --- Linguist achievement ---
  useEffect(() => {
    if (!isBetaUser) return;
    const count = recordLocale(locale);
    if (count >= 3) {
      queueAchievement({ key: 'wordcraft_linguist', icon: '🌍' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game over ---
  useEffect(() => {
    if (game.state.turn === 'over') {
      setCelebration((prev) => ({ kind: 'gameOver', burstId: prev.burstId + 1 }));
    }
  }, [game.state.turn]);

  // --- Error shake ---
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

  if (authLoading || !isBetaUser) {
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
    if (e.startsWith('INVALID_WORD:')) return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) });
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

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 pb-24 max-w-[820px] mx-auto w-full space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${language}`)}>
            <ArrowLeft className="w-4 h-4 me-1" />
            {t('common.backToHome')}
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-neo-purple" />
              <h1 className="text-2xl font-neo-display text-neo-white">{t('wordcraft.title')}</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-neo-display font-black uppercase tracking-widest bg-neo-purple text-white rounded border border-neo-purple-dark">
                BETA
              </span>
            </div>
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

        <div className="relative">
          <WordCraftBoard
            board={game.state.board}
            pendingPlacements={game.state.pendingPlacements}
            onCellClick={game.placeOnBoard}
            disabled={game.state.turn !== 'player'}
          />
          {scoreFloat ? (
            <ScoreFloat
              key={scoreFloat.key}
              score={scoreFloat.score}
              overdrive={scoreFloat.overdrive}
              isBingo={scoreFloat.isBingo}
              encouragement={scoreFloat.encouragement}
            />
          ) : null}
        </div>

        <HeatMeter
          heat={game.state.heat}
          overdrive={game.state.overdrive}
          burnout={game.state.burnout}
          label={t('wordcraft.heatLabel')}
        />

        {game.state.burnout ? (
          <div className="px-3 py-2 bg-neo-red/20 border-neo border-neo-red text-neo-red text-sm rounded-neo text-center font-neo-display">
            {t('wordcraft.burnout')}
          </div>
        ) : null}

        <WordCraftRack
          tiles={game.state.player.rack}
          selectedId={game.state.selectedRackTileId}
          pendingIds={pendingIds}
          onSelect={game.selectRackTile}
          disabled={game.state.turn !== 'player' || !dict || game.state.burnout}
          ariaLabel={t('wordcraft.yourRack')}
        />

        <WordCraftControls
          canSubmit={game.state.pendingPlacements.length > 0 && !!dict && game.state.turn === 'player' && !game.state.burnout}
          canRecall={game.state.pendingPlacements.length > 0}
          canSwap={game.state.player.rack.length > 0 && game.state.turn === 'player' && !game.state.burnout}
          disabled={game.state.turn !== 'player' || !dict || game.state.burnout}
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
