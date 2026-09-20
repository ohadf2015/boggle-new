'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Crown, Hammer, Loader2, LogIn, Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import { wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RevengeEntry, RivalView, UseEstate } from '../useEstate';
import { TowerMini, boardViewH } from './TowerMini';
import { PaybackBanner } from './Payback';
import { type Standing, type T, rankStandings, rivalName, teaserTowers } from './rivalUtils';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/**
 * End of run: your tower next to three real rivals', ranked by height, each one
 * drawn from their stored `last_tower`. Tap a rival to go and knock it down.
 * Guests see the board blurred behind a sign-in CTA — the comparison is the
 * pitch, so it has to be visible before you sign in.
 */

interface Props {
  t: T;
  estate: UseEstate;
  myTower: TowerBlock[];
  myHeightM: number;
  /** `revenge` = the raid this swing answers (null = an ordinary wreck). */
  onPick: (rival: RivalView, revenge: RevengeEntry | null) => void;
}

export function RivalBoard({ t, estate, myTower, myHeightM, onPick }: Props) {
  const { profile, user } = useAuth();
  const [state, setState] = useState<{ rivals: RivalView[]; revenge: RevengeEntry[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const { authed, rivals: fetchRivals } = estate;

  useEffect(() => {
    if (!authed) return;
    let live = true;
    fetchRivals()
      .then((r) => {
        if (live) setState(r ?? { rivals: [], revenge: [] });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [authed, fetchRivals]);

  // Auth resolves late: show the board's own loading state until it settles, or
  // a signed-in player gets a flash of the guest sign-in pitch first.
  if (estate.status === 'loading' || (authed && !state && !failed)) {
    return (
      <Panel t={t}>
        <div className="flex items-center justify-center gap-2 py-6 font-neo-display text-sm font-bold text-neo-cream/80">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('wordTowerV2.rivals.loading')}
        </div>
      </Panel>
    );
  }

  if (!authed) return <GuestTeaser t={t} />;

  const rivals = state?.rivals ?? [];
  const revenge = state?.revenge ?? [];
  // The mini renders the SAME floors the raid will swing at (capped + restacked),
  // so the building you tap is the building you smash.
  const standings = rankStandings([
    { key: 'me', name: t('wordTowerV2.rivals.you'), heightM: myHeightM, tower: wreckableTower(myTower), rival: null },
    ...rivals.map((r) => ({ key: r.userId, name: rivalName(r, t), heightM: r.bestM, tower: wreckableTower(r.lastTower), rival: r })),
  ]);
  const viewH = boardViewH(standings.map((s) => s.tower));

  return (
    <Panel t={t}>
      {revenge.length > 0 ? (
        <div className="mt-2">
          <PaybackBanner
            t={t}
            rival={revenge[0].rival}
            grievance={revenge[0]}
            tower={wreckableTower(revenge[0].rival.lastTower)}
            onRevenge={() => onPick(revenge[0].rival, revenge[0])}
          />
        </div>
      ) : null}
      {rivals.length === 0 ? (
        <p className="px-2 py-4 text-center font-neo-display text-sm font-bold text-neo-cream/80">{t('wordTowerV2.rivals.none')}</p>
      ) : (
        <ul
          className="mt-2 grid gap-1.5 md:gap-3"
          style={{ gridTemplateColumns: `repeat(${standings.length}, minmax(0, 1fr))` }}
        >
          {standings.map((s) => (
            <li key={s.key}>
              <Column t={t} s={s} viewH={viewH} meId={user?.id} meAvatar={profile?.avatar_config} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({ t, children }: { t: T; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-neo border-neo-thick border-black bg-neo-navy p-2.5 text-neo-cream shadow-hard md:mt-0 md:p-4">
      <h3 className="flex items-center justify-center gap-1.5 font-neo-display text-sm font-black uppercase tracking-widest text-neo-lime md:text-lg">
        <Swords className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
        {t('wordTowerV2.rivals.title')}
      </h3>
      {children}
    </section>
  );
}

function Column({
  t, s, viewH, meId, meAvatar, onPick,
}: {
  t: T;
  s: Standing;
  viewH: number;
  meId?: string;
  meAvatar?: unknown;
  onPick: Props['onPick'];
}) {
  const me = s.rival === null;
  const body = (
    <>
      <div className="flex items-center justify-center gap-1">
        {s.rank === 1 ? <Crown className="h-4 w-4 text-neo-yellow" aria-hidden /> : null}
        <span className="font-neo-display text-[11px] font-black tabular-nums opacity-80">#{s.rank}</span>
      </div>
      <div className={`mt-1 h-24 w-full md:h-48 lg:h-56 ${me ? '' : 'opacity-95'}`}>
        {s.tower.length > 0 ? (
          <TowerMini tower={s.tower} viewH={viewH} className="h-full w-full" title={s.name} />
        ) : (
          <div className="flex h-full items-end justify-center pb-1 text-center font-neo-display text-[10px] font-bold leading-tight opacity-60">
            {t('wordTowerV2.rivals.emptyTower')}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-center">
        <Avatar
          userId={me ? meId : s.rival?.userId}
          customAvatar={(me ? meAvatar : s.rival?.avatar.avatarConfig) as never}
          size="sm"
          disableEffects
        />
      </div>
      <p className="truncate text-center font-neo-display text-[11px] font-bold">{s.name}</p>
      <p className="text-center font-neo-display text-sm font-black tabular-nums text-neo-lime">
        {s.heightM.toFixed(0)}
        {t('wordTowerV2.unitM')}
      </p>
    </>
  );

  if (me) {
    return (
      <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-1.5 pb-2">{body}</div>
    );
  }
  const canWreck = s.tower.length > 0;
  return (
    <button
      type="button"
      onClick={() => s.rival && onPick(s.rival, null)}
      disabled={!canWreck}
      aria-label={t('wordTowerV2.rivals.wreckName', { name: s.name })}
      className="w-full rounded-neo border-neo border-black bg-neo-navy-light p-1.5 pb-2 text-start shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 motion-safe:hover:-translate-y-0.5"
    >
      {body}
      <span className="mt-1 flex items-center justify-center gap-1 rounded-sm border-neo border-black bg-neo-pink px-1 py-0.5 font-neo-display text-[10px] font-black uppercase text-neo-navy">
        <Hammer className="h-3 w-3" aria-hidden />
        {t('wordTowerV2.rivals.wreck')}
      </span>
    </button>
  );
}

function GuestTeaser({ t }: { t: T }) {
  const [signIn, setSignIn] = useState(false);
  const towers = teaserTowers();
  const viewH = boardViewH(towers);
  return (
    <Panel t={t}>
      <div className="relative">
        <ul className="mt-2 grid grid-cols-3 gap-2 blur-[3px]" aria-hidden>
          {towers.map((tower, i) => (
            <li key={i} className="rounded-neo border-neo border-black bg-neo-navy-light p-1.5">
              <div className="h-20 w-full md:h-28">
                <TowerMini tower={tower} viewH={viewH} className="h-full w-full" ghost />
              </div>
              <div className="mx-auto mt-1 h-6 w-6 rounded-full border-neo border-black bg-neo-cream/40" />
              <div className="mx-auto mt-1 h-2 w-12 rounded-sm bg-neo-cream/40" />
            </li>
          ))}
        </ul>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
          <p className="font-neo-display text-base font-black uppercase">{t('wordTowerV2.rivals.guestTitle')}</p>
          <p className="max-w-[16rem] font-neo-display text-xs font-bold leading-tight text-neo-cream/90">
            {t('wordTowerV2.rivals.guestBody')}
          </p>
          <button
            type="button"
            onClick={() => setSignIn(true)}
            className="mt-1 flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-1.5 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            {t('wordTowerV2.rivals.signIn')}
          </button>
          {signIn ? <AuthModal isOpen onClose={() => setSignIn(false)} initialMode="signin" /> : null}
        </div>
      </div>
    </Panel>
  );
}
