'use client';

/**
 * Sealed Bid solo — casino table. 5 rounds, chip wallet.
 * Path: form word → set stake → lock (or pass). Unique wins, clash loses stake.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinActions } from '@/contexts/CoinContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import SealedBidTable from '@/components/sealedBid/SealedBidTable';
import Showdown from '@/components/sealedBid/Showdown';
import { SealedBidSessionSummary } from '@/components/sealedBid/SealedBidSessionSummary';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { dealRounds, type SbRackDeal } from '@/lib/sealedBid/sp/rackPool';
import { initWallet, clampStake, applyDelta, cashOutCoins, type ChipWallet } from '@/lib/sealedBid/sp/chipWallet';
import { settleBid, type Settlement } from '@/lib/sealedBid/sp/wager';
import { getSoloDateISO, isSoloDailyClaimed, markSoloDailyClaimed } from '@/lib/solo/soloDaily';
import { SEALED_BID_ASSETS } from '@/components/sealedBid/sealedBidAssets';

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

interface RoundRecord {
  deal: SbRackDeal;
  settlement: Settlement;
  playerWord: string | null;
}

export default function SealedBidPage() {
  const { t, language, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const { addCoins } = useCoinActions();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const reducedMotion = useReducedMotion();

  const [deals, setDeals] = useState<SbRackDeal[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wallet, setWallet] = useState<ChipWallet>(initWallet());
  const [chosenWord, setChosenWord] = useState('');
  const [stake, setStake] = useState(0);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [phase, setPhase] = useState<'bidding' | 'revealed' | 'done'>('bidding');
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [winFlash, setWinFlash] = useState(0);

  const bidMultiplierRef = useRef(3.0);
  const [bidMultiplier, setBidMultiplier] = useState(3.0);
  const payoutTargetRef = useRef<HTMLElement>(null);
  const didInitRef = useRef(false);

  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const seed = `${language}-${Date.now()}`;
    setDeals(dealRounds(5, language, seed));
    setWallet(initWallet());
    setPhase('bidding');
  }, [language]);

  // Speed-bonus multiplier: 3.0× → 1.0× over 15 s; resets each bidding phase
  useEffect(() => {
    if (phase !== 'bidding') return;
    bidMultiplierRef.current = 3.0;
    setBidMultiplier(3.0);
    const start = Date.now();
    const id = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / 15000);
      const next = Math.max(1.0, 3.0 - 2.0 * progress);
      bidMultiplierRef.current = next;
      setBidMultiplier(next);
    }, 100);
    return () => clearInterval(id);
  }, [phase, roundIndex]);

  const currentDeal = deals[roundIndex];

  const lockBid = useCallback(async () => {
    if (phase !== 'bidding' || pending || !currentDeal) return;
    setValidationError(null);
    if (!chosenWord || chosenWord.length < 3) {
      setValidationError(t('sealedBid.error.tooShort', 'Word must be at least 3 letters'));
      return;
    }
    if (stake <= 0) {
      setValidationError(t('sealedBid.error.needStake', 'Set a stake to lock your bid'));
      return;
    }
    const speedMult = bidMultiplierRef.current;
    setPending(true);
    const dictOk = await dictCheck(chosenWord, language);
    setPending(false);

    const sett = settleBid({
      playerWord: dictOk ? chosenWord : null,
      botWords: currentDeal.botPicks,
      dictOk,
      rack: currentDeal.rack,
      stake,
    });

    // Apply speed bonus: unique bids submitted quickly earn a larger delta
    const finalSett =
      sett.outcome === 'unique' && speedMult > 1.01
        ? { ...sett, delta: Math.round(sett.delta * speedMult) }
        : sett;

    const newWallet = applyDelta(wallet, finalSett.delta);
    setWallet(newWallet);
    setSettlement(finalSett);
    setPhase('revealed');
    setValidationError(null);

    if (finalSett.outcome === 'unique') {
      playSound('wordAccepted');
      SharedFxApp.spawnBurst('sparkle-gold', window.innerWidth / 2, window.innerHeight / 3, {
        count: 16,
      });
    } else {
      playSound('wordRejected');
    }
  }, [phase, pending, currentDeal, chosenWord, stake, wallet, language, playSound, t]);

  const pass = useCallback(() => {
    if (phase !== 'bidding' || pending || !currentDeal) return;
    const sett = settleBid({
      playerWord: null,
      botWords: currentDeal.botPicks,
      dictOk: false,
      rack: currentDeal.rack,
      stake: 0,
    });
    setWallet(applyDelta(wallet, sett.delta));
    setSettlement(sett);
    setPhase('revealed');
  }, [phase, pending, currentDeal, wallet]);

  const nextRound = useCallback(() => {
    if (phase !== 'revealed' || !settlement || !currentDeal) return;
    setHistory((h) => [...h, { deal: currentDeal, settlement, playerWord: chosenWord || null }]);
    setChosenWord('');
    setStake(0);
    setSettlement(null);

    if (wallet.busted || roundIndex >= 4) {
      setPhase('done');
      playSound('victoryFanfare');
      setWinFlash((f) => f + 1);
      SharedFxApp.spawnBurst('celebration', window.innerWidth / 2, window.innerHeight / 3);

      if (!isSoloDailyClaimed('sealed-bid', getSoloDateISO(), language)) {
        const coins = cashOutCoins(wallet.chips);
        if (coins > 0) {
          markSoloDailyClaimed('sealed-bid', getSoloDateISO(), language);
          addCoins(coins, 'sealed_bid_cashout', {
            chips: wallet.chips,
            rounds: (roundIndex + 1).toString(),
            busted: wallet.busted ? 'yes' : 'no',
          })
            .then(() => setCoinsAwarded(coins))
            .catch(() => setCoinsAwarded(coins));
        }
      }
    } else {
      setRoundIndex((i) => i + 1);
      setPhase('bidding');
    }
  }, [phase, settlement, currentDeal, wallet, roundIndex, language, playSound, addCoins, chosenWord]);

  const newGame = useCallback(() => {
    const seed = `${language}-${Date.now()}`;
    setDeals(dealRounds(5, language, seed));
    setRoundIndex(0);
    setWallet(initWallet());
    setChosenWord('');
    setStake(0);
    setSettlement(null);
    setPhase('bidding');
    setHistory([]);
    setCoinsAwarded(0);
  }, [language]);

  const handleWordChange = useCallback((w: string) => {
    setChosenWord(w);
    if (validationError) setValidationError(null);
  }, [validationError]);

  const handleStakeChange = useCallback(
    (s: number) => {
      setStake(clampStake(wallet, s));
    },
    [wallet]
  );

  // Slim HUD: back · round · chip stack only (no dual title / badge)
  const header = (
    <div
      data-testid="sb-hud"
      className="mx-auto flex w-full max-w-lg items-center justify-between gap-2"
    >
      <Link
        href={`/${locale}`}
        aria-label={t('common.back')}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-neo border-2 border-black bg-neo-navy-light px-2.5 py-1.5 text-neo-white shadow-hard-sm"
      >
        <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
      </Link>

      <span
        data-testid="sb-round"
        className="rounded-neo border-2 border-black bg-neo-navy-light px-3 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white shadow-hard-sm"
      >
        {t('sealedBid.roundLabel', { n: roundIndex + 1, total: 5 })}
      </span>

      <span
        ref={payoutTargetRef}
        data-testid="sb-chip-stack"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-black bg-neo-yellow px-2.5 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy shadow-hard-sm tabular-nums"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG asset */}
        <img
          src={SEALED_BID_ASSETS.stackChip}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 shrink-0"
          draggable={false}
        />
        {t('sealedBid.chipStack', { chips: wallet.chips })}
      </span>
    </div>
  );

  return (
    <GameStage accent="cyan" header={header} className="bg-neo-navy">
      <ModeCoach mode="sealedBid" />
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-cyan/40" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col min-h-0" dir={dir}>
        <div aria-live="polite" className="sr-only">
          {phase === 'revealed' && settlement
            ? t(`sealedBid.outcome.${settlement.outcome}`)
            : phase === 'done'
              ? t('sealedBid.gameOver')
              : ''}
        </div>
        {phase === 'done' ? (
          <div className="flex flex-1 flex-col gap-4 py-2">
            <div className="animate-neo-pop rounded-neo border-3 border-black bg-neo-yellow p-5 text-center shadow-hard-lg">
              <h2 className="inline-flex items-center justify-center gap-2 font-neo-display text-xl font-black uppercase text-neo-navy">
                <Trophy className="h-5 w-5" />
                {wallet.busted ? t('sealedBid.busted') : t('sealedBid.gameOver')}
              </h2>
              <p className="mt-2 font-neo-display text-5xl font-black tabular-nums text-neo-navy">
                {wallet.chips}
              </p>
              <p className="font-neo-body text-xs font-bold uppercase tracking-wide text-neo-navy/70">
                {t('sealedBid.chips')}
              </p>
            </div>
            {history.length > 0 && (
              <SealedBidSessionSummary
                history={history.map((h) => ({
                  outcome: h.settlement.outcome,
                  basePoints: Math.abs(h.settlement.delta),
                  points: h.settlement.delta,
                  playerWord: h.playerWord,
                  botWord: h.deal.botPicks[0] ?? '',
                }))}
                totalScore={history.reduce((s, h) => s + h.settlement.delta, 0)}
                chips={wallet.chips}
                coinsAwarded={coinsAwarded}
              />
            )}
            <button
              type="button"
              onClick={newGame}
              className="min-h-12 w-full rounded-neo border-3 border-black bg-neo-lime px-4 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
            >
              {t('sealedBid.playAgain')}
            </button>
          </div>
        ) : phase === 'revealed' && settlement && currentDeal ? (
          <Showdown
            playerWord={chosenWord || null}
            bots={currentDeal.botPicks.map((word, i) => ({
              name: t('sealedBid.botRival', { n: i + 1 }),
              word,
            }))}
            settlement={settlement}
            reducedMotion={reducedMotion}
            onDone={nextRound}
            payoutTargetRef={payoutTargetRef}
            dir={dir}
          />
        ) : (
          currentDeal && (
            <>
              <div className="mb-2 flex justify-center">
                <span className={cn(
                  'rounded-full border-2 border-black px-3 py-1 font-neo-display text-sm font-black tabular-nums shadow-hard-sm',
                  bidMultiplier > 2.0 ? 'bg-neo-lime text-neo-navy' :
                  bidMultiplier > 1.5 ? 'bg-neo-yellow text-neo-navy' :
                  'bg-neo-orange text-neo-white'
                )}>
                  {t('sealedBid.speedBonus', { n: bidMultiplier.toFixed(1) })}
                </span>
              </div>
            <SealedBidTable
              letters={currentDeal.displayLetters}
              word={chosenWord}
              stake={stake}
              balance={wallet.chips}
              pending={pending}
              busted={wallet.busted}
              onWordChange={handleWordChange}
              onWordSubmit={() => {
                void lockBid();
              }}
              onStakeChange={handleStakeChange}
              onLock={() => {
                void lockBid();
              }}
              onPass={pass}
              reducedMotion={reducedMotion}
              dir={dir}
            />
            </>
          )
        )}
        {validationError && (
          <p className="mt-2 text-center font-neo-body text-sm text-neo-red" role="alert">
            {validationError}
          </p>
        )}
      </div>
    </GameStage>
  );
}
