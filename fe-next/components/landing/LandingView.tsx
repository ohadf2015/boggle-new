'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaUser, FaUsers, FaRobot, FaBullseye, FaTrophy, FaDoorOpen, FaCrown, FaMedal, FaQuestionCircle } from 'react-icons/fa';
import { Target, Flame, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import ModeCard from './ModeCard';
import Header from '@/components/Header';
import SocialProof from '@/components/SocialProof';
import {
  getPuzzleNumber,
  getDailyChallengeDate,
  hasPlayedToday,
  getDailyStreak,
  getSecondsUntilNextDaily,
  formatCountdown,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

/**
 * LandingView - Main landing page with game mode selection
 * Two prominent cards: Single Player and Multiplayer
 */
const LandingView: React.FC = () => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { playTrack, TRACKS } = useMusic();
  const isLandscape = useMobileLandscape();
  const liveRoomStats = useLiveRoomStats();

  // Daily challenge state
  const [dailyPuzzleNumber, setDailyPuzzleNumber] = useState<number>(0);
  const [hasPlayedDaily, setHasPlayedDaily] = useState<boolean>(false);
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [dailyCountdown, setDailyCountdown] = useState<string>('');

  // Check for room parameter and redirect to multiplayer page
  // This handles shared links (WhatsApp, barcode scan, copy link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      // Redirect to multiplayer page with all query params preserved (room, utm_source, etc.)
      router.replace(`/${language}/multiplayer${window.location.search}`);
    }
  }, [language, router]);

  // Initialize daily challenge info
  useEffect(() => {
    const date = getDailyChallengeDate();
    setDailyPuzzleNumber(getPuzzleNumber(date));
    setHasPlayedDaily(hasPlayedToday(language as Language));
    setDailyStreak(getDailyStreak().currentStreak);
  }, [language]);

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const seconds = getSecondsUntilNextDaily();
      setDailyCountdown(formatCountdown(seconds));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Play lobby music on landing page (same as multiplayer lobby)
  // Note: We always call playTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  // Landscape mode - optimized horizontal layout
  if (isLandscape) {
    return (
      <main
        className="flex h-screen w-full items-center justify-center bg-slate-900 p-3 gap-4 overflow-x-hidden landscape-full-height"
        role="main"
        aria-label="Game mode selection"
      >
        {/* Single Player */}
        <Link
          href={`/${language}/singleplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-cyan to-cyan-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[90vh] min-h-[300px]"
          aria-label={`${t('landing.singlePlayer') || 'Single Player'} - ${t('landing.singlePlayerDesc') || 'Practice at your own pace'}`}
        >
          <FaUser className="text-5xl text-neo-black" aria-hidden="true" />
          <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.singlePlayer') || 'Single Player'}</span>
          <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaRobot className="inline mr-1" />Bots</span>
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaTrophy className="inline mr-1" />Challenges</span>
          </div>
        </Link>

        {/* Multiplayer */}
        <Link
          href={`/${language}/multiplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-pink to-pink-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[90vh] min-h-[300px]"
          aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
        >
          <FaUsers className="text-5xl text-neo-black" aria-hidden="true" />
          <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
          <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaDoorOpen className="inline mr-1" />Rooms</span>
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaCrown className="inline mr-1" />Host</span>
          </div>
        </Link>

        {/* How to Play - compact, always visible */}
        <Link
          href={`/${language}/rules`}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-neo-yellow text-neo-black font-bold text-lg border-3 border-neo-black rounded-neo min-h-[48px] shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm transition-all z-10"
          aria-label={t('joinView.howToPlay') || 'How to Play'}
        >
          <FaQuestionCircle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          <span className="hidden sm:inline">{t('joinView.howToPlay') || 'How to Play'}</span>
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      {/* Header */}
      <Header />

      {/* Social Proof Banner - Live player activity */}
      <SocialProof variant="banner" />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-2 xs:px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
        {/* Daily Challenge Banner - Prominent placement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <Link href={`/${language}/daily`}>
            <div className="relative overflow-hidden bg-gradient-to-r from-neo-yellow via-neo-orange to-neo-pink p-4 sm:p-6 rounded-neo-lg border-4 border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all cursor-pointer">
              {/* Background decoration */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-neo border-3 border-neo-black">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-neo-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black uppercase text-neo-black/70">
                        {t('daily.badge')}
                      </span>
                      {dailyStreak > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-neo-black/70">
                          <Flame className="w-3 h-3" />
                          {dailyStreak}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-neo-black">
                      {hasPlayedDaily ? (
                        <span className="flex items-center gap-2">
                          {t('daily.completed')} <span className="text-lg">✓</span>
                        </span>
                      ) : (
                        t('daily.bannerTitle').replace('{number}', String(dailyPuzzleNumber))
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-neo-black/75">
                      {hasPlayedDaily
                        ? `${t('daily.nextPuzzleIn')} ${dailyCountdown}`
                        : t('daily.bannerSubtitle')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-bold text-neo-black/75 uppercase">
                      {hasPlayedDaily ? t('results.viewResults') : t('daily.playNow')}
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-neo-black rounded-neo">
                    {language === 'he' ? (
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    ) : (
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-4">
            {t('landing.chooseMode') || 'Choose Your Mode'}
          </h1>
          <p className="text-lg sm:text-xl font-medium text-neo-black/80 dark:text-neo-white/85 max-w-2xl mx-auto">
            {t('landing.subtitle') || 'Play solo to practice and beat your high scores, or compete with friends in real-time multiplayer!'}
          </p>
        </motion.div>

        {/* Mode cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto"
        >
          {/* Single Player Card */}
          <ModeCard
            title={t('landing.singlePlayer') || 'Single Player'}
            description={t('landing.singlePlayerDesc') || 'Practice at your own pace or challenge yourself!'}
            features={[
              { icon: <FaRobot />, label: t('landing.feature.soloVsBots') || 'Solo vs Bots' },
              { icon: <FaBullseye />, label: t('landing.feature.practiceMode') || 'Practice Mode' },
              { icon: <FaTrophy />, label: t('landing.feature.challenges') || 'Challenges & High Scores' },
            ]}
            href={`/${language}/singleplayer`}
            icon={<FaUser />}
            variant="cyan"
          />

          {/* Multiplayer Card */}
          <ModeCard
            title={t('landing.multiplayer') || 'Multiplayer'}
            description={t('landing.multiplayerDesc') || 'Compete with friends in real-time!'}
            features={[
              { icon: <FaDoorOpen />, label: t('landing.feature.joinRooms') || 'Join Rooms' },
              { icon: <FaCrown />, label: t('landing.feature.hostGames') || 'Host Games' },
              { icon: <FaMedal />, label: t('landing.feature.tournaments') || 'Tournaments' },
            ]}
            href={`/${language}/multiplayer`}
            icon={<FaUsers />}
            variant="pink"
            liveBadge={{
              openRooms: liveRoomStats.openRooms,
              totalPlayers: liveRoomStats.totalPlayers,
              roomsLabel: t('landing.openRooms') || 'open rooms',
              playersLabel: t('landing.playersLive') || 'playing now',
            }}
          />
        </motion.div>

        {/* How to Play Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mt-8 sm:mt-10"
        >
          <Link
            href={`/${language}/rules`}
            className="
              inline-flex items-center gap-2 sm:gap-3
              px-5 sm:px-6 py-2.5 sm:py-3
              bg-neo-yellow text-neo-black
              font-bold text-base sm:text-lg
              border-3 border-neo-black
              rounded-neo shadow-hard
              hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              transition-all duration-100
            "
          >
            <FaQuestionCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            {t('joinView.howToPlay') || 'How to Play?'}
          </Link>
        </motion.div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-sm text-neo-black/70 dark:text-neo-white/70 mt-6 sm:mt-8"
        >
          {t('landing.hint') || 'New to the game? Start with Single Player to learn the ropes!'}
        </motion.p>
      </main>
    </div>
  );
};

export default LandingView;
