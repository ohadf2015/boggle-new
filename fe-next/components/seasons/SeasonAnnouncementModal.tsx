'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, Trophy, Target, Swords, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCurrentSeasonDynamic, getSeasonTimeRemaining } from '@/lib/seasons';
import { tierColor } from '@/lib/tierColors';

const STORAGE_KEY = 'lexiclash:lastSeenSeasonId';

interface PrevSummary {
  season_id: number;
  total_score: number;
  games_played: number;
  games_won: number;
  ranked_mmr: number;
  rank_position: number;
  peak_tier: string;
}

export const SeasonAnnouncementModal: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
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

  if (!open) return null;

  const totalHours = Math.max(0, Math.floor(remaining.totalMs / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const prevColor = prev ? tierColor(prev.peak_tier) : null;

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
          className="relative w-full max-w-md bg-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg p-6 flex flex-col gap-4 outline-none border-l-8 border-l-neo-lime max-h-[92vh] overflow-y-auto"
          initial={reduceMotion ? false : { scale: 0.85, y: 32 }}
          animate={{ scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="season-announcement-title"
        >
          <div className="text-center flex flex-col items-center gap-3">
            <motion.div
              initial={reduceMotion ? false : { scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
              className="drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
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

            <motion.div
              className="flex items-center gap-2 px-3 py-1 bg-neo-lime border-neo border-black rounded-neo shadow-hard-sm"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4 text-black" aria-hidden="true" />
              <span className="font-neo-display text-sm text-black uppercase tracking-wide">
                {t('season.newSeason')}
              </span>
            </motion.div>

            <motion.h2
              id="season-announcement-title"
              className="font-neo-display text-2xl text-neo-cream"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.4 }}
            >
              {t('season.name', { number: season.id, theme: season.theme })}
            </motion.h2>
          </div>

          {/* Big visible countdown */}
          <motion.div
            className="bg-neo-navy-light border-neo-thick border-black rounded-neo p-3 shadow-hard-sm"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.45 }}
            data-testid="season-countdown"
          >
            <p className="text-xs text-neo-cream/60 text-center uppercase tracking-wider font-neo-body">
              {t('season.endsIn', { days })}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-neo-pink border-neo border-black rounded-neo py-2 text-center shadow-hard-sm">
                <p className="font-neo-display text-3xl text-black leading-none">{days}</p>
                <p className="text-[10px] text-black/70 uppercase tracking-wider mt-1">days</p>
              </div>
              <div className="bg-neo-cyan border-neo border-black rounded-neo py-2 text-center shadow-hard-sm">
                <p className="font-neo-display text-3xl text-black leading-none">{hours}</p>
                <p className="text-[10px] text-black/70 uppercase tracking-wider mt-1">hrs</p>
              </div>
            </div>
          </motion.div>

          {/* Previous season summary (only when player had a previous season) */}
          {prev && prevColor && (
            <motion.div
              className="bg-neo-navy-light border-neo border-black rounded-neo p-3 flex flex-col gap-2"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.55 }}
              data-testid="season-prev-summary"
            >
              <p className="text-xs text-neo-cream/60 uppercase tracking-wider font-neo-body">
                {t('season.thisSeason')} — Season {prev.season_id}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neo-navy rounded-neo border-neo border-black p-2">
                  <Trophy className="w-4 h-4 mx-auto text-neo-yellow" aria-hidden="true" />
                  <p className="font-neo-display text-lg text-neo-cream leading-none mt-1">#{prev.rank_position}</p>
                  <p className="text-[10px] text-neo-cream/60 uppercase mt-0.5">{t('leaderboard.rank')}</p>
                </div>
                <div className="bg-neo-navy rounded-neo border-neo border-black p-2">
                  <Target className="w-4 h-4 mx-auto text-neo-lime" aria-hidden="true" />
                  <p className="font-neo-display text-lg text-neo-cream leading-none mt-1">{prev.total_score.toLocaleString()}</p>
                  <p className="text-[10px] text-neo-cream/60 uppercase mt-0.5">{t('leaderboard.score')}</p>
                </div>
                <div className="bg-neo-navy rounded-neo border-neo border-black p-2">
                  <Swords className="w-4 h-4 mx-auto text-neo-pink" aria-hidden="true" />
                  <p className="font-neo-display text-lg text-neo-cream leading-none mt-1">{prev.games_played}</p>
                  <p className="text-[10px] text-neo-cream/60 uppercase mt-0.5">{t('leaderboard.games')}</p>
                </div>
              </div>
              <div className="flex justify-center mt-1">
                <span className={`px-2 py-1 text-xs font-neo-display border-neo border-black rounded-neo bg-neo-navy ${prevColor.text}`}>
                  {t('season.peakTier', { tier: prev.peak_tier })}
                </span>
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
                py-3 bg-neo-navy-light text-neo-cream font-neo-display
                border-neo border-black rounded-neo shadow-hard-sm
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
                py-3 bg-neo-lime text-black font-neo-display
                border-neo border-black rounded-neo shadow-hard-sm
                hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                transition-all
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
