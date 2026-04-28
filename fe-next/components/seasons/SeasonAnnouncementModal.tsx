'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, Trophy, Target, Swords, ArrowRight, Flame, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { supabase } from '@/lib/supabase';
import { getCurrentSeasonDynamic, getSeasonTimeRemaining } from '@/lib/seasons';
import { tierColor } from '@/lib/tierColors';

const STORAGE_KEY = 'lexiclash:lastSeenSeasonId';
const FINAL_STRETCH_DAYS = 7;

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
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: ((i * 47) % 100),
  top: ((i * 73) % 100),
  size: 6 + ((i * 13) % 10),
  delay: ((i * 17) % 100) / 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 31) % 360,
}));

export const SeasonAnnouncementModal: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [season, setSeason] = useState(() => getCurrentSeasonDynamic());
  const [remaining, setRemaining] = useState(() => getSeasonTimeRemaining());
  const [prevSeasonId, setPrevSeasonId] = useState<number | null>(null);
  const [prev, setPrev] = useState<PrevSummary | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = getCurrentSeasonDynamic();
    setSeason(current);
    setRemaining(getSeasonTimeRemaining());
    const lastSeenStr = localStorage.getItem(STORAGE_KEY);
    const lastSeen = Number(lastSeenStr ?? '0');
    if (lastSeen !== current.id) {
      setOpen(true);
      if (lastSeen > 0 && lastSeen < current.id) setPrevSeasonId(lastSeen);
    }
  }, []);

  useEffect(() => {
    if (!open || prevSeasonId == null || !user?.id || !supabase) return;
    supabase
      .rpc('get_player_season_summary', { p_player_id: user.id, p_season_id: prevSeasonId })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (row) setPrev(row as PrevSummary);
      });
  }, [open, prevSeasonId, user?.id]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setRemaining(getSeasonTimeRemaining()), 60_000);
    return () => clearInterval(interval);
  }, [open]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(season.id));
    }
    setOpen(false);
  };

  const viewPast = () => {
    dismiss();
    router.push(`/${language}/leaderboard`);
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

  const totalHours = Math.max(0, Math.floor(remaining.totalMs / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const prevColor = prev ? tierColor(prev.peak_tier) : null;
  const winRate = useMemo(() => {
    if (!prev || prev.games_played === 0) return 0;
    return Math.round((prev.games_won / prev.games_played) * 100);
  }, [prev]);

  // Smart label: rotation evidence wins, else fall back to "ending soon" if short.
  const isFinalStretch = !prevSeasonId && days < FINAL_STRETCH_DAYS;
  const badgeLabel = isFinalStretch ? t('season.finalDays') : t('season.newSeason');
  const badgeBg = isFinalStretch ? 'bg-neo-orange' : 'bg-neo-lime';
  const badgeIcon = isFinalStretch ? Flame : Sparkles;
  const BadgeIcon = badgeIcon;

  if (!open) return null;
  if (isOnCrazyGamesPlatform) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 texture-halftone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
        data-testid="season-announcement-modal"
        data-season-id={season.id}
      >
        <motion.div
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
          {/* Confetti dust — only in non-reduced-motion */}
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-neo" aria-hidden="true">
              {CONFETTI.map((c, i) => (
                <motion.span
                  key={i}
                  className="absolute block"
                  style={{
                    left: `${c.left}%`,
                    top: `${c.top}%`,
                    width: c.size,
                    height: c.size,
                    backgroundColor: c.color,
                    borderRadius: i % 3 === 0 ? '50%' : '2px',
                  }}
                  initial={{ y: -20, opacity: 0, rotate: 0 }}
                  animate={{
                    y: [0, 12, 0],
                    opacity: [0, 0.9, 0.5, 0.9, 0],
                    rotate: [0, c.rotate, c.rotate * 2],
                  }}
                  transition={{
                    duration: 4 + (i % 3),
                    delay: c.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative text-center flex flex-col items-center gap-3">
            {/* Mascot with animated sparkle ring */}
            <div className="relative">
              {!reduceMotion && (
                <motion.div
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
              <motion.div
                initial={reduceMotion ? false : { scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }
                }
                className="relative drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                <Image
                  src="/mascot/celebration.gif"
                  alt=""
                  width={140}
                  height={140}
                  priority
                  unoptimized
                  data-testid="season-announcement-mascot"
                />
              </motion.div>
            </div>

            <motion.div
              className={`flex items-center gap-2 px-4 py-1.5 ${badgeBg} border-neo-thick border-black rounded-neo shadow-hard`}
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.8 }}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: [0.8, 1.1, 1] }
              }
              transition={reduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.5 }}
            >
              <BadgeIcon className="w-4 h-4 text-black" aria-hidden="true" />
              <span className="font-neo-display font-black text-sm text-black uppercase tracking-wider">
                {badgeLabel}
              </span>
              <BadgeIcon className="w-4 h-4 text-black" aria-hidden="true" />
            </motion.div>

            <motion.h2
              id="season-announcement-title"
              className="font-neo-display font-black text-2xl text-neo-cream tracking-tight"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.4 }}
            >
              {t('season.name', { number: season.id, theme: season.theme })}
            </motion.h2>
          </div>

          {/* Big visible countdown — gradient header pill */}
          <motion.div
            className="relative bg-neo-navy-light border-neo-thick border-black rounded-neo p-3 shadow-hard-sm overflow-hidden"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.45 }}
            data-testid="season-countdown"
          >
            <p className="text-xs text-neo-cream/80 text-center uppercase tracking-widest font-neo-display font-black">
              {isFinalStretch ? t('season.finalDays') : t('season.endsIn', { days })}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <motion.div
                className="bg-neo-pink border-neo-thick border-black rounded-neo py-3 text-center shadow-hard"
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [-1, 1, -1] }
                }
                transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="font-neo-display font-black text-4xl text-black leading-none tabular-nums">{days}</p>
                <p className="text-[11px] font-black text-black uppercase tracking-widest mt-1">days</p>
              </motion.div>
              <motion.div
                className="bg-neo-cyan border-neo-thick border-black rounded-neo py-3 text-center shadow-hard"
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [1, -1, 1] }
                }
                transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="font-neo-display font-black text-4xl text-black leading-none tabular-nums">{hours}</p>
                <p className="text-[11px] font-black text-black uppercase tracking-widest mt-1">hrs</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Previous-season recap (authenticated + had a prior season) */}
          {prev && prevColor && (
            <motion.div
              className="bg-gradient-to-br from-neo-navy-light to-neo-navy border-neo-thick border-black rounded-neo p-4 flex flex-col gap-3 shadow-hard-sm"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.55 }}
              data-testid="season-prev-summary"
            >
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-neo-yellow" aria-hidden="true" />
                <p className="text-xs text-neo-cream uppercase tracking-widest font-neo-display font-black">
                  {t('season.lastSeason')}
                </p>
                <Crown className="w-4 h-4 text-neo-yellow" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neo-navy rounded-neo border-neo-thick border-black p-2 shadow-hard-sm">
                  <Trophy className="w-4 h-4 mx-auto text-neo-yellow" aria-hidden="true" />
                  <p className="font-neo-display font-black text-lg text-neo-cream leading-none mt-1 tabular-nums">#{prev.rank_position}</p>
                  <p className="text-[10px] text-neo-cream/70 uppercase tracking-wider mt-0.5 font-bold">{t('leaderboard.rank')}</p>
                </div>
                <div className="bg-neo-navy rounded-neo border-neo-thick border-black p-2 shadow-hard-sm">
                  <Target className="w-4 h-4 mx-auto text-neo-lime" aria-hidden="true" />
                  <p className="font-neo-display font-black text-lg text-neo-cream leading-none mt-1 tabular-nums">{prev.total_score.toLocaleString()}</p>
                  <p className="text-[10px] text-neo-cream/70 uppercase tracking-wider mt-0.5 font-bold">{t('leaderboard.score')}</p>
                </div>
                <div className="bg-neo-navy rounded-neo border-neo-thick border-black p-2 shadow-hard-sm">
                  <Swords className="w-4 h-4 mx-auto text-neo-pink" aria-hidden="true" />
                  <p className="font-neo-display font-black text-lg text-neo-cream leading-none mt-1 tabular-nums">{prev.games_played}</p>
                  <p className="text-[10px] text-neo-cream/70 uppercase tracking-wider mt-0.5 font-bold">{t('leaderboard.games')}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className={`px-3 py-1 text-xs font-neo-display font-black border-neo-thick border-black rounded-neo bg-neo-navy shadow-hard-sm ${prevColor.text}`}>
                  {t('season.peakTier', { tier: prev.peak_tier })}
                </span>
                {prev.games_played > 0 && (
                  <span className="px-3 py-1 text-xs font-neo-display font-black border-neo-thick border-black rounded-neo bg-neo-lime text-black shadow-hard-sm tabular-nums">
                    {winRate}% WR
                  </span>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            className="grid grid-cols-2 gap-2"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.65 }}
          >
            <button
              onClick={viewPast}
              className="
                py-3 bg-neo-navy-light text-neo-cream font-neo-display font-black
                border-neo-thick border-black rounded-neo shadow-hard-sm
                hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                transition-all text-sm flex items-center justify-center gap-1
              "
              aria-label={t('season.pastSeasons')}
            >
              {t('season.pastSeasons')}
              <ArrowRight className="w-3 h-3 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              onClick={dismiss}
              className="
                py-3 bg-neo-lime text-black font-neo-display font-black
                border-neo-thick border-black rounded-neo shadow-hard
                hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                transition-all uppercase tracking-wider
              "
              aria-label={t('season.continue')}
            >
              {t('season.continue')}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
