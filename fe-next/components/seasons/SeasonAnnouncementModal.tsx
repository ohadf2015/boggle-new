'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Trophy, Target, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { supabase } from '@/lib/supabase';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
import { tierColor } from '@/lib/tierColors';

const STORAGE_KEY = 'lexiclash:lastSeenSeasonId';
const FORCE_PARAM = 'seasonModal';

const storageKeyFor = (userId: string | null | undefined) =>
  userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

interface PrevSummary {
  season_id: number;
  total_score: number;
  games_played: number;
  games_won: number;
  ranked_mmr: number;
  rank_position: number;
  peak_tier: string;
}

const CONFETTI_COLORS = ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFE135', '#FF6B35'];

// Deterministic confetti positions so SSR/CSR match.
const CONFETTI = Array.from({ length: 56 }, (_, i) => ({
  left: ((i * 47) % 100),
  top: ((i * 73) % 100),
  size: 6 + ((i * 13) % 10),
  delay: ((i * 17) % 100) / 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 31) % 360,
  duration: 3 + (i % 4),
}));

export const SeasonAnnouncementModal: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [season, setSeason] = useState(() => getCurrentSeasonDynamic());
  const [prevSeasonId, setPrevSeasonId] = useState<number | null>(null);
  const [prev, setPrev] = useState<PrevSummary | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const forceSignal = searchParams?.get(FORCE_PARAM) ?? null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = getCurrentSeasonDynamic();
    setSeason(current);

    const params = new URLSearchParams(window.location.search);
    const forced = params.get(FORCE_PARAM) === '1';

    const key = storageKeyFor(user?.id);
    const lastSeen = Number(localStorage.getItem(key) ?? '0');

    if (forced || lastSeen !== current.id) {
      setOpen(true);
      if (lastSeen > 0 && lastSeen < current.id) setPrevSeasonId(lastSeen);
    }

    if (forced) {
      params.delete(FORCE_PARAM);
      const qs = params.toString();
      const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', next);
    }
  }, [user?.id, forceSignal]);

  useEffect(() => {
    if (!open || prevSeasonId == null || !user?.id || !supabase) return;
    supabase
      .rpc('get_player_season_summary', { p_player_id: user.id, p_season_id: prevSeasonId })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (row) setPrev(row as PrevSummary);
      });
  }, [open, prevSeasonId, user?.id]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKeyFor(user?.id), String(season.id));
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prevColor = prev ? tierColor(prev.peak_tier) : null;

  if (!open) return null;
  if (isOnCrazyGamesPlatform) return null;

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 texture-halftone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
        data-testid="season-announcement-modal"
        data-season-id={season.id}
      >
        {/* Full-screen confetti rain — celebratory backdrop */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <m.span
                key={i}
                className="absolute block"
                style={{
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  width: c.size,
                  height: c.size,
                  backgroundColor: c.color,
                  borderRadius: i % 3 === 0 ? '50%' : '2px',
                  boxShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                }}
                initial={{ y: -40, opacity: 0, rotate: 0 }}
                animate={{
                  y: ['-10vh', '110vh'],
                  opacity: [0, 1, 1, 0.6, 0],
                  rotate: [0, c.rotate, c.rotate * 2],
                }}
                transition={{
                  duration: c.duration,
                  delay: c.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}
        <m.div
          ref={dialogRef}
          tabIndex={-1}
          className="relative w-full max-w-md bg-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg p-6 flex flex-col gap-4 outline-none border-l-8 border-l-neo-lime max-h-[92vh] overflow-y-auto overflow-x-hidden"
          initial={reduceMotion ? false : { scale: 0.85, y: 32 }}
          animate={{ scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="season-announcement-title"
        >
          <div className="relative text-center flex flex-col items-center gap-3">
            {/* Mascot with animated sparkle ring */}
            <div className="relative">
              {!reduceMotion && (
                <m.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'conic-gradient(from 0deg, #BFFF00, #FF1493, #00FFFF, #FFE135, #BFFF00)',
                    filter: 'blur(14px)',
                    opacity: 0.55,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  aria-hidden="true"
                />
              )}
              <m.div
                initial={reduceMotion ? false : { scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }
                }
                className="relative drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                <div
                  data-testid="season-mascot-clip"
                  className="relative rounded-full overflow-hidden bg-neo-navy w-[140px] h-[140px] border-neo-thick border-black"
                >
                  <Image
                    src="/mascot/celebration.webp"
                    alt=""
                    width={140}
                    height={140}
                    priority
                    unoptimized
                    data-testid="season-announcement-mascot"
                  />
                </div>
              </m.div>
            </div>

            <m.div
              className="flex items-center gap-2 px-4 py-1.5 bg-neo-lime border-neo-thick border-black rounded-neo shadow-hard"
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.8 }}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: [0.8, 1.1, 1] }
              }
              transition={reduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-black" aria-hidden="true" />
              <span className="font-neo-display font-black text-sm text-black uppercase tracking-wider">
                {t('season.newSeason')}
              </span>
              <Sparkles className="w-4 h-4 text-black" aria-hidden="true" />
            </m.div>

            <m.h2
              id="season-announcement-title"
              className="font-neo-display font-black text-2xl text-neo-white tracking-tight"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.4 }}
            >
              {t('season.name', { number: season.id, theme: season.theme })}
            </m.h2>
          </div>

          {/*
            Previous-season recap — only the 3 icon tiles (rank / score / games).
            Dropped: header bar ("YOUR LAST SEASON" sandwiched in crowns) and the
            peak-tier + WR chip strip below — both duplicate data already visible.
            Each tile: snappy spring entrance + idle wobble + hover lift.
          */}
          {prev && prevColor && (
            <m.div
              className="grid grid-cols-3 gap-2 text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.55 }}
              data-testid="season-prev-summary"
            >
              {[
                {
                  icon: <Trophy className="w-4 h-4 text-black" aria-hidden="true" />,
                  accent: 'bg-neo-yellow',
                  value: `#${prev.rank_position}`,
                  label: t('leaderboard.rank'),
                },
                {
                  icon: <Target className="w-4 h-4 text-black" aria-hidden="true" />,
                  accent: 'bg-neo-lime',
                  value: prev.total_score.toLocaleString(),
                  label: t('leaderboard.score'),
                },
                {
                  icon: <Swords className="w-4 h-4 text-black" aria-hidden="true" />,
                  accent: 'bg-neo-pink',
                  value: String(prev.games_played),
                  label: t('leaderboard.games'),
                },
              ].map((tile, i) => (
                <m.div
                  key={tile.label}
                  className="bg-neo-navy rounded-neo border-neo-thick border-black p-2 shadow-hard-sm"
                  initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.7, rotate: -4 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1, rotate: i % 2 === 0 ? [-1, 1, -1] : [1, -1, 1] }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 320,
                          damping: 18,
                          delay: 0.6 + i * 0.08,
                          rotate: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
                        }
                  }
                  whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: 0, y: -2 }}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-neo border-neo border-black shadow-hard-sm ${tile.accent}`}
                  >
                    {tile.icon}
                  </span>
                  <p className="font-neo-display font-black text-lg text-neo-white leading-none mt-1 tabular-nums">
                    {tile.value}
                  </p>
                  <p className="text-[10px] text-neo-white uppercase tracking-wider mt-0.5 font-bold">
                    {tile.label}
                  </p>
                </m.div>
              ))}
            </m.div>
          )}

          <m.button
            onClick={dismiss}
            className="
              w-full py-3 bg-neo-lime text-black font-neo-display font-black
              border-neo-thick border-black rounded-neo shadow-hard
              hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
              transition-all uppercase tracking-wider
            "
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.65 }}
            aria-label={t('season.continue')}
          >
            {t('season.continue')}
          </m.button>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};
