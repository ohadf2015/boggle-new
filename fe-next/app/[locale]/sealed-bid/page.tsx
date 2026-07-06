'use client';

/**
 * Sealed Bid solo — a poker betting table. Each of 5 rounds deals a 7-letter
 * rack (guaranteed to contain a full-rack word) on a word wheel. The player
 * spells a word, stakes chips at rarity-scaled odds, and locks a SEALED bid:
 * unique vs the hidden bots pays out, a clash loses the stake. Chips cash out
 * to coins once per day at the end.
 *
 * Rack generation, chip math, and wager settlement are pure (`rackPool`,
 * `chipWallet`, `wager`); player words are validated via /api/dictionary/check
 * so we never ship the full dictionary to the browser. Hebrew works in
 * base-letter form (the wheel applies sofits for display) and flips to RTL.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Coins, Gavel } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinActions } from '@/contexts/CoinContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import SealedBidWheel from '@/components/sealedBid/SealedBidWheel';
import OddsBoard from '@/components/sealedBid/OddsBoard';
import ChipTray from '@/components/sealedBid/ChipTray';
import Showdown from '@/components/sealedBid/Showdown';
import { SealedBidSessionSummary } from '@/components/sealedBid/SealedBidSessionSummary';
import { dealRounds, type SbRackDeal } from '@/lib/sealedBid/sp/rackPool';
import {
  initWallet,
  clampStake,
  applyDelta,
  cashOutCoins,
  START_CHIPS,
  MIN_STAKE,
  type ChipWallet,
} from '@/lib/sealedBid/sp/chipWallet';
import { settleBid, type Settlement } from '@/lib/sealedBid/sp/wager';
import type { RoundResult } from '@/lib/sealedBid/sp/sbEngine';
import { getSoloDateISO, isSoloDailyClaimed, markSoloDailyClaimed } from '@/lib/solo/soloDaily';

const ROUNDS = 5;
// Bot opponents are proper-noun characters (not translated UI copy).
const BOT_NAMES: [string, string] = ['Rook', 'Vega'];

async function dictCheck(word: string, lang: string): Promise<boolean> {
  try {
    const res = await fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language: lang }),
    });
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}

/** Two hidden bots per round, drawn from the rack's precomputed common picks. */
function botsFor(deal: SbRackDeal, names: [string, string]): { name: string; word: string }[] {
  const picks = deal.botPicks;
  return [
    { name: names[0], word: (picks[0] ?? '').toUpperCase() },
    { name: names[1], word: (picks[1] ?? picks[0] ?? '').toUpperCase() },
  ];
}

export default function SealedBidPage() {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const { addCoins } = useCoinActions();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const isHe = locale === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const dictLang = isHe ? 'he' : 'en';
  const reducedMotion = useReducedMotion();

  const [deals, setDeals] = useState<SbRackDeal[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wallet, setWallet] = useState<ChipWallet>(() => initWallet(START_CHIPS));
  const [chosenWord, setChosenWord] = useState('');
  const [playedWord, setPlayedWord] = useState<string | null>(null);
  const [stake, setStake] = useState(MIN_STAKE);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [phase, setPhase] = useState<'bidding' | 'revealed' | 'done'>('bidding');
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [coinsAwarded, setCoinsAwarded] = useState<number | undefined>(undefined);
  const [winFlash, setWinFlash] = useState(0);

  const payoutTargetRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);

  // Full-screen game surface.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Deal the rounds once, client-only (post-hydration → no SSR mismatch).
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setDeals(dealRounds(ROUNDS, dictLang, `${dictLang}-${Date.now()}`));
  }, [dictLang]);

  const currentDeal = deals[roundIndex];

  const canLock =
    phase === 'bidding' &&
    !pending &&
    !!currentDeal &&
    chosenWord.length >= 3 &&
    stake >= MIN_STAKE &&
    stake <= wallet.chips &&
    !wallet.busted;

  const recordAndReveal = useCallback(
    (sett: Settlement, playerWord: string | null) => {
      setWallet((w) => applyDelta(w, sett.delta));
      setSettlement(sett);
      setPlayedWord(playerWord);
      setHistory((h) => [
        ...h,
        {
          outcome: sett.outcome,
          basePoints: sett.stake,
          points: sett.delta,
          playerWord,
          botWord: currentDeal?.botPicks[0] ?? '',
        },
      ]);
      setPhase('revealed');
      if (sett.outcome === 'unique') {
        playSound('wordAccepted');
      } else if (sett.outcome === 'clash') {
        playSound('wordRejected');
      }
    },
    [currentDeal, playSound],
  );

  const lockBid = useCallback(async () => {
    if (!canLock || !currentDeal) return;
    setPending(true);
    const dictOk = await dictCheck(chosenWord, dictLang);
    setPending(false);
    // Always pass the word + dictOk so settleBid applies the invalid-word ante
    // (a staked word that isn't in the dictionary loses a small ante, not a
    // free pass). A deliberate Pass sends a null word via `pass()` below.
    const sett = settleBid({
      playerWord: chosenWord,
      botWords: currentDeal.botPicks,
      dictOk,
      rack: currentDeal.rack,
      stake,
    });
    recordAndReveal(sett, chosenWord.toUpperCase());
  }, [canLock, currentDeal, chosenWord, dictLang, stake, recordAndReveal]);

  const pass = useCallback(() => {
    if (phase !== 'bidding' || pending || !currentDeal) return;
    const sett = settleBid({
      playerWord: null,
      botWords: currentDeal.botPicks,
      dictOk: false,
      rack: currentDeal.rack,
      stake: 0,
    });
    recordAndReveal(sett, null);
  }, [phase, pending, currentDeal, recordAndReveal]);

  // Advance to the next round, or end the game (busted / last round).
  const nextRound = useCallback(() => {
    if (phase !== 'revealed') return;
    const endedWallet = wallet; // wallet already reflects this round's delta
    setChosenWord('');
    setPlayedWord(null);
    setStake(MIN_STAKE);
    setSettlement(null);

    if (endedWallet.busted || roundIndex >= ROUNDS - 1) {
      setPhase('done');
      playSound('victoryFanfare');
      setWinFlash((f) => f + 1);
      if (!reducedMotion) {
        SharedFxApp.spawnBurst('celebration', window.innerWidth / 2, window.innerHeight / 3);
      }
      // Cash out chips → coins, ONCE per day. Mark claimed synchronously before
      // the async award so a fast replay can't double-award (Class-1 guard).
      if (!isSoloDailyClaimed('sealed-bid', getSoloDateISO(), dictLang)) {
        const coins = cashOutCoins(endedWallet.chips);
        if (coins > 0) {
          markSoloDailyClaimed('sealed-bid', getSoloDateISO(), dictLang);
          addCoins(coins, 'sealed_bid_cashout', {
            chips: endedWallet.chips,
            rounds: (roundIndex + 1).toString(),
            busted: endedWallet.busted ? 'yes' : 'no',
          }).catch(() => {});
        }
        setCoinsAwarded(coins);
      } else {
        setCoinsAwarded(0);
      }
    } else {
      setRoundIndex((i) => i + 1);
      setPhase('bidding');
    }
  }, [phase, wallet, roundIndex, reducedMotion, dictLang, addCoins, playSound]);

  const newGame = useCallback(() => {
    setDeals(dealRounds(ROUNDS, dictLang, `${dictLang}-${Date.now()}`));
    setRoundIndex(0);
    setWallet(initWallet(START_CHIPS));
    setChosenWord('');
    setPlayedWord(null);
    setStake(MIN_STAKE);
    setSettlement(null);
    setPhase('bidding');
    setHistory([]);
    setCoinsAwarded(undefined);
  }, [dictLang]);

  return (
    <GameStage>
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-lime" />
      <main
        dir={dir}
        className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-4 bg-neo-navy px-4 py-4 text-neo-white"
      >
        {/* Header: back + round counter + chip stack (coin-stream target) */}
        <header className="flex items-center justify-between gap-2">
          <Link
            href={`/${locale}`}
            aria-label={t('common.back')}
            className="flex h-10 w-10 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard"
          >
            <ArrowLeft className="h-5 w-5 text-neo-cyan rtl:rotate-180" aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-1.5 shadow-hard">
            <Gavel className="h-4 w-4 text-neo-cyan" aria-hidden="true" />
            <span className="font-neo-display font-black text-sm text-neo-white">
              {t('sealedBid.round')} {Math.min(roundIndex + 1, ROUNDS)}/{ROUNDS}
            </span>
          </div>

          <div
            ref={payoutTargetRef}
            data-testid="chip-stack"
            className="flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-1.5 shadow-hard"
          >
            <Coins className="h-4 w-4 text-neo-yellow" aria-hidden="true" />
            <span className="font-neo-display font-black text-sm text-neo-yellow">{wallet.chips}</span>
          </div>
        </header>

        {phase !== 'done' && currentDeal && (
          <>
            {/* Word wheel — spell your bid */}
            <section className="flex flex-1 items-center justify-center">
              <SealedBidWheel
                key={roundIndex}
                letters={currentDeal.displayLetters}
                disabled={phase !== 'bidding' || pending}
                onChange={(word) => setChosenWord(word)}
                onSubmit={() => {
                  if (canLock) void lockBid();
                }}
                reducedMotion={reducedMotion}
                dir={dir}
              />
            </section>

            {/* Odds board + chip tray — read the odds, place your stake */}
            <section className="space-y-3">
              <OddsBoard word={chosenWord} stake={stake} reducedMotion={reducedMotion} />
              <ChipTray
                balance={wallet.chips}
                stake={stake}
                disabled={phase !== 'bidding' || pending}
                onStakeChange={(s) => setStake(clampStake(wallet, s))}
                reducedMotion={reducedMotion}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={pass}
                  disabled={phase !== 'bidding' || pending}
                  className="flex-1 rounded-neo border-neo-thick border-black bg-neo-navy-light px-4 py-3 font-neo-display font-black uppercase tracking-wide text-neo-white/70 shadow-hard disabled:opacity-40"
                >
                  {t('sealedBid.pass')}
                </button>
                <button
                  type="button"
                  onClick={() => void lockBid()}
                  disabled={!canLock}
                  className="flex-[2] rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
                >
                  {t('sealedBid.lockBid')}
                </button>
              </div>
            </section>
          </>
        )}

        {/* Showdown overlay */}
        {phase === 'revealed' && settlement && currentDeal && (
          <Showdown
            playerWord={playedWord}
            bots={botsFor(currentDeal, BOT_NAMES)}
            settlement={settlement}
            reducedMotion={reducedMotion}
            onDone={nextRound}
            payoutTargetRef={payoutTargetRef}
          />
        )}

        {/* Game over: cash-out summary */}
        {phase === 'done' && (
          <section className="flex flex-1 flex-col items-center justify-center gap-4">
            <h2 className="font-neo-display font-black text-2xl uppercase tracking-wide text-neo-yellow">
              {wallet.busted ? t('sealedBid.busted') : t('sealedBid.gameOver')}
            </h2>
            <div className="w-full max-w-md">
              <SealedBidSessionSummary
                history={history}
                totalScore={wallet.chips}
                chips={wallet.chips}
                coinsAwarded={coinsAwarded}
              />
            </div>
            <button
              type="button"
              onClick={newGame}
              className="rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {t('sealedBid.playAgain')}
            </button>
          </section>
        )}
      </main>
    </GameStage>
  );
}
