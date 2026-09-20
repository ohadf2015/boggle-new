'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Swords, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RevengeEntry, UseEstate } from '../useEstate';
import { RaidFlow } from './RaidFlow';
import { TowerMini, boardViewH } from './TowerMini';
import { grievanceLine, towerHalfW } from './Payback';
import { revengePrize } from './revengePrize';
import { type T, greetingFor, rivalName } from './rivalUtils';

/**
 * Payback lives on the FRONT of the game, not behind a run.
 *
 * The bar (Coin Master) puts REVENGE in the top bar the moment someone hits
 * you: one tap opens THEIR village with the crosshairs already on it, and it
 * costs nothing — that is the whole return hook, "something is always waiting
 * for you". Ours used to answer a raid with "finish a run first", which is the
 * opposite bargain.
 *
 * So: open the game with a raid unanswered and the attacker's own tower is the
 * first thing on screen (one attacker) or a list of the faces that hit you
 * (several), each with one button that drops straight into the swing. Close it
 * and a pill stays parked under the empire button until the debt is settled —
 * it is driven by UN-AVENGED raids (`rivals().revenge`), not by unseen ones, so
 * glancing at it once never makes the offer disappear.
 */

/**
 * Which raids have had their moment. NOT component state: the district screen
 * unmounts this component, so a player who answers one raid, opens the empire
 * and comes back would be shoved into the takeover again by the raids they
 * have not opened yet. Marking everything seen on show would fix that too, but
 * it would also zero the district badge — the badge is the point.
 *
 * Keyed by raid id rather than a single flag so a raid that lands LATER in the
 * session still gets its takeover; `greetingFor` owns the rule.
 */
const greeted = new Set<string>();

interface Props {
  t: T;
  estate: UseEstate;
  /** Wrecking balls this raid gets (a finished run banks more). */
  balls: number;
  reducedMotion: boolean;
  /** A raid takes the whole screen: the parent pauses the game canvas. */
  onRaidOpen: (open: boolean) => void;
}

/**
 * The bottom edge of the live HUD row in viewport px, so anything parked under
 * the bar lands under the REAL bar. The row wraps to a second line the moment
 * the score reaches four figures, which is why this is observed rather than
 * hard-coded; the fallback is the unwrapped height.
 */
function useTopBarBottom(): number {
  const [bottom, setBottom] = useState(54);
  useEffect(() => {
    const bar = document.querySelector('[data-wt2-topbar]');
    if (!bar) return;
    const measure = () => setBottom(Math.round(bar.getBoundingClientRect().bottom + 8));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  return bottom;
}

export function RevengeHome({ t, estate, balls, reducedMotion, onRaidOpen }: Props) {
  const barBottom = useTopBarBottom();
  const { authed, inbox, markSeen, rivals: fetchRivals } = estate;
  /** null = still scouting; [] = nobody owes you anything. */
  const [debts, setDebts] = useState<RevengeEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<RevengeEntry | null>(null);

  useEffect(() => {
    if (!authed) return;
    let live = true;
    fetchRivals()
      .then((r) => live && setDebts(r?.revenge ?? []))
      .catch(() => live && setDebts([]));
    return () => {
      live = false;
    };
  }, [authed, fetchRivals]);

  // Raids you have not even seen yet open the payback on their own. One
  // attacker = straight onto their tower (the bar's revenge screen); several =
  // the list of who owes you, one tap each.
  useEffect(() => {
    if (!debts) return;
    const greeting = greetingFor(debts, inbox.length, greeted);
    if (greeting.kind === 'none') return;
    debts.forEach((d) => greeted.add(d.raidId));
    if (greeting.kind === 'target') setTarget(greeting.entry);
    else setOpen(true);
  }, [debts, inbox.length]);

  const raiding = target !== null || open;
  useEffect(() => {
    onRaidOpen(raiding);
  }, [raiding, onRaidOpen]);

  // The global mute FAB only re-probes its corner on mount and on resize, so
  // anything that arrives later lands underneath it. Poke it.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [raiding]);

  /** Their raids leave the inbox once you have answered (or waved it off). */
  const seen = useCallback(
    (attackerId?: string) => {
      const ids = inbox.filter((r) => !attackerId || r.attackerId === attackerId).map((r) => r.id);
      if (ids.length > 0) void markSeen(ids);
    },
    [inbox, markSeen],
  );

  const closeTarget = useCallback(
    (entry: RevengeEntry) => {
      seen(entry.rival.userId);
      // The swing either avenged the raid or it did not: re-read rather than
      // guess, so a blocked payback keeps the debt on the pill.
      setTarget(null);
      fetchRivals()
        .then((r) => {
          const next = r?.revenge ?? [];
          // The rivals read returns the LATEST un-avenged raid per attacker, so
          // an attacker who hit you several times comes back under a NEW raid
          // id once the one you just answered is avenged. Greet those ids here,
          // or that id — unseen and un-greeted — re-opens the takeover the
          // instant the player closed it.
          next.forEach((d) => greeted.add(d.raidId));
          setDebts(next);
        })
        .catch(() => {
          /* keep what we had — the pill is not worth an error state */
        });
    },
    [seen, fetchRivals],
  );

  if (target) {
    return (
      <RaidFlow
        t={t}
        estate={estate}
        rival={target.rival}
        grievance={target}
        revenge
        balls={balls}
        reducedMotion={reducedMotion}
        onClose={() => closeTarget(target)}
      />
    );
  }

  if (!authed || !debts || debts.length === 0) return null;

  if (open) {
    return (
      <RevengeList
        t={t}
        debts={debts}
        onPick={(entry) => {
          setOpen(false);
          setTarget(entry);
        }}
        onClose={() => {
          setOpen(false);
          seen();
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        debts.forEach((d) => greeted.add(d.raidId));
        if (debts.length === 1) setTarget(debts[0]);
        else setOpen(true);
      }}
      /* MEASURED, not a magic offset. The HUD row wraps to a second line as
         soon as the score reaches four figures, and a fixed `top-[3.4rem]`
         then landed the pill squarely on the EMPIRE button — `elementFromPoint`
         at the district button's centre returned this pill, so the whole
         estate was unreachable from the game screen for anyone who owed a
         payback. Sitting under the real bar can't collide with it. */
      style={{ top: barBottom }}
      className="pointer-events-auto absolute end-3 top-[3.4rem] z-40 flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-pink px-2.5 py-1.5 font-neo-display text-sm font-black uppercase tabular-nums text-neo-navy shadow-hard motion-safe:animate-neo-pop active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
    >
      <Swords className="h-4 w-4" aria-hidden />
      {t('wordTowerV2.rivals.revengePill', { n: debts.length })}
    </button>
  );
}

/** Who hit you, what it cost, one button each — the Coin Master revenge list. */
function RevengeList({
  t,
  debts,
  onPick,
  onClose,
}: {
  t: T;
  debts: RevengeEntry[];
  onPick: (entry: RevengeEntry) => void;
  onClose: () => void;
}) {
  const towers = useMemo(() => debts.map((d) => wreckableTower(d.rival.lastTower)), [debts]);
  const viewH = useMemo(() => boardViewH(towers), [towers]);
  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-neo-navy p-4 text-neo-cream" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden md:max-w-[84rem] md:justify-center md:gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 font-neo-display text-2xl font-black uppercase leading-none text-neo-pink md:text-5xl">
            <Swords className="h-6 w-6 shrink-0 md:h-10 md:w-10" aria-hidden />
            <span className="truncate">{t('wordTowerV2.rivals.revengeTitle')}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('wordTowerV2.rivals.dismiss')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-lime md:text-lg">
          {t('wordTowerV2.rivals.revengeFree')}
        </p>

        <ul className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-y-auto pb-1 md:mt-4 md:grid md:max-h-[76vh] md:flex-none md:auto-cols-fr md:grid-flow-col md:gap-6 md:overflow-visible">
          {/* Phone: the cards SHARE the leftover height (bounded, so five debts
              still fit) instead of two small rows floating in a void under the
              title — their tower grows with the card. */}
          {debts.map((d, i) => (
            <li key={d.raidId} className="flex max-h-[12rem] min-h-[6.5rem] flex-1 md:h-full md:max-h-none md:flex-none">
              {/* Nothing standing = nothing to swing at: the reveal would open
                  on an empty plot with a dead button, so the row says so here
                  and stays quiet instead. */}
              <button
                type="button"
                onClick={() => onPick(d)}
                disabled={towers[i].length === 0}
                className="flex h-full w-full items-stretch gap-2.5 overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy-light p-2 text-start shadow-hard motion-safe:animate-neo-pop active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-60 disabled:shadow-none md:min-h-0 md:flex-col md:items-center md:p-4"
                style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}
              >
                <div className="flex shrink-0 flex-col items-center gap-1 md:order-2 md:min-h-0 md:w-full md:flex-1">
                  <div className="h-full w-[3.75rem] md:h-full md:w-full">
                    {towers[i].length > 0 ? (
                      <>
                        {/* Phone: each tower framed on its own, or the tallest
                            rival's scale squeezes a 6-floor tower into a
                            sliver in a 80px box. Desktop: one shared scale,
                            where the cards are tall enough for the comparison
                            to read. Both hug their own width — the default
                            half-width draws a thin coloured strip. */}
                        <TowerMini
                          tower={towers[i]}
                          viewH={boardViewH([towers[i]])}
                          halfW={towerHalfW(towers[i])}
                          className="h-full w-full md:hidden"
                          title={t('wordTowerV2.rivals.target', { name: rivalName(d.rival, t) })}
                        />
                        <TowerMini
                          tower={towers[i]}
                          viewH={viewH}
                          halfW={towerHalfW(towers[i])}
                          className="hidden h-full w-full md:block"
                          title={t('wordTowerV2.rivals.target', { name: rivalName(d.rival, t) })}
                        />
                      </>
                    ) : (
                      <p className="flex h-full items-end justify-center text-center font-neo-display text-[10px] font-bold leading-tight opacity-60">
                        {t('wordTowerV2.rivals.emptyTower')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col md:order-1 md:w-full">
                  <div className="flex items-center gap-2">
                    <Avatar userId={d.rival.userId} customAvatar={d.rival.avatar.avatarConfig as never} size="md" disableEffects />
                    <p className="min-w-0 flex-1 truncate font-neo-display text-lg font-black uppercase leading-none md:text-3xl">
                      {rivalName(d.rival, t)}
                    </p>
                    {!d.blocked && d.coinsStolen > 0 ? (
                      <span dir="ltr" className="shrink-0 rounded-neo border-neo border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-base font-black tabular-nums text-neo-navy shadow-hard-sm md:text-xl">
                        -{d.coinsStolen}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-neo-display text-[12px] font-bold leading-tight text-neo-cream/90 md:text-lg">
                    {grievanceLine(t, d, rivalName(d.rival, t))}
                  </p>
                  {/* WHY tap this row. Two of round 3's three rows read "your
                      shield held" and stopped there — an offer with no stated
                      prize, which the judge counted as a list that only looks
                      like three opportunities. The number is the server's own
                      payout formula at zero accuracy, so it is a floor we can
                      always honour. */}
                  {towers[i].length > 0 ? <PrizeChip t={t} rival={d.rival} /> : null}
                  <span
                    className={`mt-auto flex items-center justify-center gap-1.5 rounded-neo border-neo-thick border-black px-2 py-1.5 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard md:mt-3 md:w-full md:py-2.5 md:text-lg ${
                      towers[i].length === 0 ? 'bg-neo-cream' : 'bg-neo-yellow'
                    }`}
                  >
                    <Swords className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">
                      {towers[i].length === 0
                        ? t('wordTowerV2.rivals.emptyTower')
                        : t('wordTowerV2.rivals.revengeName', { name: rivalName(d.rival, t) })}
                    </span>
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* A thumb-reachable way out: the X is at the top of a 844px phone. */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full shrink-0 rounded-neo border-neo-thick border-black bg-neo-cream px-6 py-2.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed md:hidden"
        >
          {t('wordTowerV2.rivals.dismiss')}
        </button>
      </div>
    </div>
  );
}

/** The prize on a revenge row: what the swing banks even if it barely lands. */
function PrizeChip({ t, rival }: { t: T; rival: RevengeEntry['rival'] }) {
  const prize = revengePrize(rival);
  return (
    <p className="mt-1 flex w-fit max-w-full items-center gap-1 rounded-sm border-neo border-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase leading-tight text-neo-navy md:mt-2 md:text-base">
      <Coins className="h-3.5 w-3.5 shrink-0 md:h-5 md:w-5" aria-hidden />
      <span className="truncate">
        {prize.shielded
          ? t('wordTowerV2.rivals.prizeShield', { n: prize.guaranteed })
          : t('wordTowerV2.rivals.prizeLoot', { n: prize.guaranteed })}
      </span>
    </p>
  );
}
