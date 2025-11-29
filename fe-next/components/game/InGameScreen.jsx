import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaDoorOpen, FaCrown } from 'react-icons/fa';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import Avatar from '../Avatar';
import GridComponent from '../GridComponent';
import CircularTimer from '../CircularTimer';
import RoomChat from '../RoomChat';
import SlotMachineText from '../SlotMachineText';
import { applyHebrewFinalLetters } from '../../utils/utils';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Shared in-game screen component for both Host and Player views
 * Shows active game state with grid, timer, found words, and leaderboard
 */
const InGameScreen = ({
  // Common props
  username,
  gameCode,
  isHost = false,
  letterGrid,
  remainingTime,
  timerValue = 1,
  foundWords = [],
  leaderboard = [],
  playersReady = [],
  comboLevel = 0,
  onExitRoom,
  onWordSubmit,
  // Tournament props
  tournamentData = null,
  // Achievement dock (rendered outside this component)
  children,
}) => {
  const { t, dir } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-1 md:p-4 flex flex-col transition-colors duration-300">

      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-1">
        <Button
          type="button"
          onClick={onExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer relative z-50"
        >
          <FaDoorOpen className="mr-2" />
          {t(isHost ? 'hostView.exitRoom' : 'playerView.exit')}
        </Button>
      </div>

      {/* Timer with Circular Progress */}
      {remainingTime !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-1 md:mb-2 relative z-10"
        >
          <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
        </motion.div>
      )}

      {/* Tournament Progress Banner */}
      {tournamentData && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-2"
        >
          <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <CardContent className="py-2 px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-yellow-300 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {tournamentData.name || t('hostView.tournament')}
                    </div>
                    <div className="text-purple-100 text-xs md:text-sm">
                      {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                    </div>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  {t('hostView.tournamentProgress')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Achievement Dock - passed as children */}
      {children}

      {/* 3 Column Layout: Found Words | Grid | Leaderboard */}
      <div className="flex flex-col lg:flex-row gap-1 md:gap-2 max-w-7xl mx-auto flex-grow w-full overflow-hidden">

        {/* Left Column: Found Words (Desktop only) - Neo-Brutalist */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
            style={{ transform: 'rotate(1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
              <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                {t('playerView.wordsFound')}
              </h3>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div className="space-y-2">
                <AnimatePresence>
                  {foundWords.map((foundWordObj, index) => {
                    const wordText = typeof foundWordObj === 'string' ? foundWordObj : foundWordObj.word;
                    const isInvalid = typeof foundWordObj === 'object' && foundWordObj.isValid === false;
                    const isLatest = index === foundWords.length - 1;
                    return (
                      <motion.div
                        key={index}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                          ${isInvalid
                            ? 'bg-neo-red text-neo-cream shadow-hard-sm line-through opacity-70'
                            : isLatest
                              ? 'bg-neo-yellow text-neo-black shadow-hard'
                              : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                      >
                        {applyHebrewFinalLetters(wordText).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {foundWords.length === 0 && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Letter Grid */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <Card className="bg-slate-800/95 dark:bg-slate-800/95 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900/90">
              <GridComponent
                grid={letterGrid}
                interactive={true}
                animateOnMount={true}
                onWordSubmit={onWordSubmit}
                className="w-full max-w-2xl"
                playerView={true}
                comboLevel={comboLevel}
              />
            </CardContent>
          </Card>

          {/* Mobile: Word count display */}
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {foundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Live Leaderboard - Neo-Brutalist */}
        <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
          <div
            className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
            style={{ transform: 'rotate(-1deg)' }}
          >
            {/* Header */}
            <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
              <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
                <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                {t('playerView.leaderboard')}
              </h3>
            </div>
            {/* Content */}
            <div className="overflow-y-auto flex-1 p-3">
              <div className="space-y-2">
                {leaderboard.map((player, index) => {
                  const isMe = player.username === username;
                  const getRankStyle = () => {
                    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
                    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
                    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
                    return 'bg-neo-cream text-neo-black border-neo-black';
                  };
                  return (
                    <motion.div
                      key={player.username}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                        hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                        ${getRankStyle()} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <Avatar
                        profilePictureUrl={player.avatar?.profilePictureUrl}
                        avatarEmoji={player.avatar?.emoji}
                        avatarColor={player.avatar?.color}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-black truncate text-sm flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          {player.isHost && <FaCrown className="text-neo-yellow" style={{ filter: 'drop-shadow(1px 1px 0px var(--neo-black))' }} />}
                          <SlotMachineText text={player.username} />
                          {isMe && (
                            <span className="text-xs bg-neo-black text-neo-cream px-2 py-0.5 rounded-neo font-bold">
                              {t('playerView.me')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold">{player.wordCount || 0} {t('hostView.words') || 'words'}</div>
                      </div>
                      <div className="text-lg font-black">
                        {player.score} <span className="text-xs font-bold">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
                {leaderboard.length === 0 && (
                  <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                    {t('hostView.waitingForPlayers')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Component - Desktop only */}
          <div className="hidden lg:block">
            <RoomChat
              username={isHost ? "Host" : username}
              isHost={isHost}
              gameCode={gameCode}
              className="max-h-[200px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InGameScreen;
