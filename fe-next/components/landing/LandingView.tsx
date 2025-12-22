'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUser, FaUsers, FaRobot, FaBullseye, FaTrophy, FaDoorOpen, FaCrown, FaMedal, FaQuestionCircle } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import ModeCard from './ModeCard';
import Header from '@/components/Header';
import SocialProof from '@/components/SocialProof';

/**
 * LandingView - Main landing page with game mode selection
 * Two prominent cards: Single Player and Multiplayer
 */
const LandingView: React.FC = () => {
  const { t, language } = useLanguage();
  const { playTrack, TRACKS } = useMusic();
  const isLandscape = useMobileLandscape();

  // Play lobby music on landing page (same as multiplayer lobby)
  // Note: We always call playTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  // Landscape mode - compact horizontal layout
  if (isLandscape) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 p-4 gap-4">
        {/* Single Player */}
        <Link
          href={`/${language}/singleplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-cyan to-cyan-400 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all h-full max-h-[80vh]"
        >
          <FaUser className="text-4xl text-neo-black" />
          <span className="text-lg font-black uppercase text-neo-black">{t('landing.singlePlayer') || 'Single Player'}</span>
          <div className="flex gap-2 text-xs">
            <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><FaRobot className="inline mr-1" />Bots</span>
            <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><FaTrophy className="inline mr-1" />Challenges</span>
          </div>
        </Link>

        {/* Multiplayer */}
        <Link
          href={`/${language}/multiplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-pink to-pink-400 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all h-full max-h-[80vh]"
        >
          <FaUsers className="text-4xl text-neo-black" />
          <span className="text-lg font-black uppercase text-neo-black">{t('landing.multiplayer') || 'Multiplayer'}</span>
          <div className="flex gap-2 text-xs">
            <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><FaDoorOpen className="inline mr-1" />Rooms</span>
            <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><FaCrown className="inline mr-1" />Host</span>
          </div>
        </Link>

        {/* How to Play - compact */}
        <Link
          href={`/${language}/rules`}
          className="absolute bottom-2 right-2 flex items-center gap-1 px-3 py-2 bg-neo-yellow text-neo-black font-bold text-sm border-2 border-neo-black rounded-neo"
        >
          <FaQuestionCircle />
          <span className="hidden sm:inline">{t('joinView.howToPlay') || 'How to Play'}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      {/* Header */}
      <Header />

      {/* Social Proof Banner - Live player activity */}
      <SocialProof variant="banner" />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            <FaQuestionCircle className="text-lg sm:text-xl" />
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
