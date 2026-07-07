'use client';

/**
 * Sealed Bid solo poker betting table. Players play 5 rounds with a chip wallet:
 * each round they build a word on the wheel, set a stake, lock in, and settle
 * against bots. Unique = win, clash = lose stake, pass = no risk. At the end,
 * chips cash out to coins (once per day via localStorage guard).
 *
 * Hebrew: wheel letters show sofits, layout mirrors RTL, directional icons flip.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Gavel, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinActions } from '@/contexts/CoinContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import SealedBidWheel from '@/components/sealedBid/SealedBidWheel';
import OddsBoard from '@/components/sealedBid/OddsBoard';
import ChipTray from '@/components/sealedBid/ChipTray';
import Showdown from '@/components/sealedBid/Showdown';
import { SealedBidSessionSummary } from '@/components/sealedBid/SealedBidSessionSummary';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { dealRounds, type SbRackDeal } from '@/lib/sealedBid/sp/rackPool';
import { initWallet, clampStake, applyDelta, cashOutCoins, type ChipWallet } from '@/lib/sealedBid/sp/chipWallet';
import { settleBid, type Settlement } from '@/lib/sealedBid/sp/wager';
import { getSoloDateISO, isSoloDailyClaimed, markSoloDailyClaimed } from '@/lib/solo/soloDaily';

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
}

export default function SealedBidPage() {
  const { t, language } = useLanguage();
  const { playSound } = useSoundEffects();
  const { addCoins } = useCoinActions();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const isHe = locale === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const reducedMotion = useReducedMotion();

  // Deals: shuffle once post-hydration
  const [deals, setDeals] = useState<SbRackDeal[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wallet, setWallet] = useState<ChipWallet>(initWallet());
  const [chosenWord, setChosenWord] = useState('');
  const [stake, setStake] = useState(0);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [phase, setPhase] = useState<'bidding' | 'revealed' | 'done'>('bidding');
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [coinsAwarded, setCoinsAwarded] = useState(0);
  const [winFlash, setWinFlash] = useState(0);

  const payoutTargetRef = useRef<HTMLElement>(null);
  const didInitRef = useRef(false);

  // Full-screen game
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Initialize deals once (post-hydration)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const seed = `${language}-${Date.now()}`;
    const generated = dealRounds(5, language, seed);
    setDeals(generated);
    setWallet(initWallet());
    setPhase('bidding');
  }, [language]);

  const currentDeal = deals[roundIndex];

  // Lock bid: validate, settle, apply delta, advance to revealed
  const lockBid = useCallback(async () => {
    if (phase !== 'bidding' || pending || !currentDeal || !chosenWord || stake <= 0) return;
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

    const newWallet = applyDelta(wallet, sett.delta);
    setWallet(newWallet);
    setSettlement(sett);
    setPhase('revealed');

    // Play sound + FX
    if (sett.outcome === 'unique') {
      playSound('wordAccepted');
      SharedFxApp.spawnBurst('sparkle-gold', window.innerWidth / 2, window.innerHeight / 3, { count: 16 });
    } else {
      playSound('wordRejected');
    }
  }, [phase, pending, currentDeal, chosenWord, stake, wallet, language, playSound]);

  // Pass: settle with null word, move to revealed
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

  // Next round: advance or end
  const nextRound = useCallback(() => {
    if (phase !== 'revealed' || !settlement || !currentDeal) return;
    setHistory((h: RoundRecord[]) => [...h, { deal: currentDeal, settlement }]);
    setChosenWord('');
    setStake(0);
    setSettlement(null);

    if (wallet.busted || roundIndex >= 4) {
      // Game over: cash out and award coins
      setPhase('done');
      playSound('victoryFanfare');
      setWinFlash((f: number) => f + 1);
      SharedFxApp.spawnBurst('celebration', window.innerWidth / 2, window.innerHeight / 3);

      // Cash out: once per day only
      if (!isSoloDailyClaimed('sealed-bid', getSoloDateISO(), language)) {
        const coins = cashOutCoins(wallet.chips);
        if (coins > 0) {
          // Mark claimed synchronously BEFORE the async award so a fast replay
          // can't double-award (Class-1: check + late write race).
          markSoloDailyClaimed('sealed-bid', getSoloDateISO(), language);
          addCoins(coins, 'sealed_bid_cashout', {
            chips: wallet.chips,
            rounds: (roundIndex + 1).toString(),
            busted: wallet.busted ? 'yes' : 'no',
          }).then(() => {
            setCoinsAwarded(coins);
          }).catch(() => {
            setCoinsAwarded(coins); // Award locally even if sync fails
          });
        }
      }
    } else {
      setRoundIndex((i: number) => i + 1);
      setPhase('bidding');
    }
  }, [phase, settlement, currentDeal, wallet, roundIndex, language, playSound, addCoins]);

  // New game
  const newGame = useCallback(() => {
    const seed = `${language}-${Date.now()}`;
    const generated = dealRounds(5, language, seed);
    setDeals(generated);
    setRoundIndex(0);
    setWallet(initWallet());
    setChosenWord('');
    setStake(0);
    setSettlement(null);
    setPhase('bidding');
    setHistory([]);
    setCoinsAwarded(0);
  }, [language]);

  // Header: round counter, chip stack with payout target
  const header = (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy-light px-2.5 py-1.5 font-neo-body text-xs text-neo-white shadow-hard-sm"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('sealedBid.title')}
        </Link>
        <h1 className="font-neo-display text-base font-black uppercase tracking-wide text-neo-white">
          {t('sealedBid.title')}
        </h1>
        <span className="inline-flex items-center gap-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white">
          <Gavel className="h-3.5 w-3.5" />
          {t('sealedBid.badge')}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-neo border-2 border-black bg-neo-navy-light px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm">
          {t('sealedBid.roundLabel', { n: roundIndex + 1, total: 5 })}
        </span>
        <span
          ref={payoutTargetRef}
          className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-navy shadow-hard-sm"
        >
          {t('sealedBid.chipStack', { chips: wallet.chips })}
        </span>
      </div>
    </div>
  );

  // Footer: controls and info
  const footer =
    phase === 'bidding' && currentDeal ? (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={lockBid}
            disabled={!chosenWord || chosenWord.length < 3 || stake <= 0 || pending || wallet.busted}
            className="flex flex-1 items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5 disabled:opacity-50"
          >
            {t('sealedBid.lockIn')}
          </button>
          <button
            type="button"
            onClick={pass}
            disabled={pending || wallet.busted}
            className="rounded-neo border-3 border-black bg-neo-navy-light px-4 py-3 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm disabled:opacity-50"
          >
            {t('sealedBid.pass')}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <GameStage accent="cyan" header={header} footer={footer}>
      <ModeCoach mode="sealedBid" />
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-cyan/40" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
        {phase === 'done' ? (
          <div className="space-y-4">
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full animate-neo-pop rounded-neo border-3 border-black bg-neo-cyan p-6 text-center shadow-hard-lg space-y-4">
                <h2 className="inline-flex items-center justify-center gap-2 font-neo-display font-black text-2xl uppercase text-neo-navy">
                  <Trophy className="h-6 w-6" />
                  {wallet.busted ? t('sealedBid.busted') : t('sealedBid.gameOver')}
                </h2>
                <p className="font-neo-display font-black text-5xl text-neo-navy">{wallet.chips}</p>
              </div>
            </div>
            {history.length > 0 && (
              <SealedBidSessionSummary
                history={[]}
                totalScore={0}
                chips={wallet.chips}
                coinsAwarded={coinsAwarded}
              />
            )}
            <button
              type="button"
              onClick={newGame}
              className="w-full rounded-neo border-3 border-black bg-neo-lime px-4 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
            >
              {t('sealedBid.playAgain')}
            </button>
          </div>
        ) : phase === 'revealed' && settlement && currentDeal ? (
          <Showdown
            playerWord={settlement.delta > 0 ? chosenWord || null : null}
            bots={currentDeal.botPicks.map((word, i) => ({ name: `Bot ${i + 1}`, word }))}
            settlement={settlement}
            reducedMotion={reducedMotion}
            onDone={nextRound}
            payoutTargetRef={payoutTargetRef as React.RefObject<HTMLElement>}
          />
        ) : (
          /* Bidding phase */
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {currentDeal && (
              <>
                <SealedBidWheel
                  letters={currentDeal.displayLetters}
                  onChange={(word) => setChosenWord(word)}
                  onSubmit={lockBid}
                  disabled={phase !== 'bidding' || pending || wallet.busted}
                  reducedMotion={reducedMotion}
                  dir={dir}
                />
                <OddsBoard word={chosenWord} stake={stake} reducedMotion={reducedMotion} />
                <ChipTray
                  balance={wallet.chips}
                  stake={stake}
                  onStakeChange={(s) => setStake(clampStake(wallet, s))}
                  disabled={phase !== 'bidding' || pending || wallet.busted}
                  reducedMotion={reducedMotion}
                />
              </>
            )}
          </div>
        )}
      </div>
    </GameStage>
  );
}
