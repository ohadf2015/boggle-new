import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSignOutAlt, FaCrown, FaMedal } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { AchievementBadge } from './components/AchievementBadge';
import GridComponent from './components/GridComponent';
import confetti from 'canvas-confetti';
import './style/animation.scss';
import { cn } from './lib/utils';



const WORD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

const LetterGrid = ({ letterGrid }) => (
  <div className="mb-6 text-center">
    <h3 className="text-lg font-bold text-cyan-400 mb-3">
      לוח המשחק
    </h3>
    <GridComponent
      grid={letterGrid}
      interactive={false}
      className="max-w-xs mx-auto"
    />
  </div>
);

const WordChip = ({ wordObj, index }) => {
  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;

  const label = isDuplicate
    ? `${wordObj.word} (כפול ❌)`
    : `${wordObj.word} ${isValid ? `(${wordObj.score})` : '(✗)'}`;

  return (
    <Badge
      className={cn(
        "font-bold",
        isDuplicate && "bg-orange-500 text-white opacity-70 line-through",
        !isDuplicate && isValid && "text-white",
        !isDuplicate && !isValid && "bg-gray-400 text-white opacity-70"
      )}
      style={{
        backgroundColor: !isDuplicate && isValid
          ? WORD_COLORS[index % WORD_COLORS.length]
          : undefined
      }}
    >
      {label}
    </Badge>
  );
};

const AchievementChip = ({ achievement, index }) => (
  <AchievementBadge achievement={achievement} index={index} />
);

const PlayerScore = ({ player, index }) => {
  // Only show detailed card for non-podium players OR if we want to show details for everyone below the podium
  // But the request was for a podium and then list.
  // Let's make the list items simpler for everyone, or just keep the cards but maybe less emphasized for non-winners.
  // Actually, the previous implementation had special styles for top 3.
  // Let's keep the cards but remove the "Podium" styling from the card itself since they are now visually on a podium.
  // Wait, if I render ALL players in the list below, it duplicates the top 3.
  // I should filter the list to show only index >= 3.
  // However, the user might want to see the DETAILS (words found) for the top 3 as well.
  // So I will keep them in the list but maybe with a different style or just standard.

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "p-4 mb-3 border backdrop-blur-md text-slate-900 dark:text-white",
          "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50"
        )}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">
            #{index + 1} {player.username}
          </h3>
          <span className="text-3xl font-bold">{player.score}</span>
        </div>

        <p className="text-sm mb-1 text-white/80">
          מילים שנמצאו: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} תקינות)`}
        </p>

        {player.longestWord && (
          <p className="text-sm mb-2 text-white/80">
            המילה הארוכה ביותר: <strong className="text-cyan-300">{player.longestWord}</strong>
          </p>
        )}

        {player.allWords && player.allWords.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold mb-2 text-white/90">מילים:</p>
            <div className="flex flex-wrap gap-2">
              {player.allWords.map((wordObj, i) => (
                <WordChip key={i} wordObj={wordObj} index={i} />
              ))}
            </div>
          </div>
        )}

        {player.achievements && player.achievements.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold mb-2 text-white/90">הישגים:</p>
            <div className="flex flex-wrap gap-2">
              {player.achievements.map((ach, i) => (
                <AchievementChip key={i} achievement={ach} index={i} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom }) => {
  const [autoReplayCountdown, setAutoReplayCountdown] = React.useState(10);
  const [isAutoReplayCancelled, setIsAutoReplayCancelled] = React.useState(false);

  const handleExitRoom = () => {
    if (window.confirm('האם אתה בטוח שברצונך לצאת מהחדר?')) {
      window.location.reload();
    }
  };

  // Auto-replay countdown
  useEffect(() => {
    if (isAutoReplayCancelled || !onReturnToRoom) return;

    if (autoReplayCountdown <= 0) {
      onReturnToRoom();
      return;
    }

    const timer = setInterval(() => {
      setAutoReplayCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [autoReplayCountdown, isAutoReplayCancelled, onReturnToRoom]);

  const sortedScores = useMemo(() => {
    return finalScores ? [...finalScores].sort((a, b) => b.score - a.score) : [];
  }, [finalScores]);

  const winner = sortedScores[0];

  // Celebration effect when results load
  useEffect(() => {
    if (winner) {
      // Initial confetti burst
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#a78bfa', '#2dd4bf', '#FFD700']
      });

      // Continuous celebration for winner
      const interval = setInterval(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#22d3ee', '#a78bfa']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#2dd4bf', '#FFD700']
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [winner]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-4 sm:p-6 overflow-auto transition-colors duration-300">
      <div className="absolute top-5 right-5">
        <Button
          onClick={handleExitRoom}
          className="font-bold bg-red-500/80 hover:bg-red-500 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          <FaSignOutAlt className="mr-2" />
          יציאה מהחדר
        </Button>
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-5"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
          BOGGLE
        </h1>
      </motion.div>

      {/* Winner Announcement Banner */}
      {winner && (
        <motion.div
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-yellow-500/90 via-yellow-600/90 to-orange-500/90 border-2 border-yellow-400/50 shadow-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] backdrop-blur-md">
            <div className="p-6 text-center">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
                className="inline-block"
              >
                <FaCrown className="text-6xl text-white drop-shadow-lg mb-2" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
                המנצח: {winner.username}!
              </h2>
              <p className="text-2xl font-bold text-white/90">
                {winner.score} נקודות
              </p>
              <div className="flex justify-center gap-2 mt-3">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <FaTrophy className="text-3xl text-white" />
                </motion.div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                >
                  <FaMedal className="text-3xl text-white" />
                </motion.div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                >
                  <FaTrophy className="text-3xl text-white" />
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-4xl"
      >
        <Card className="p-4 sm:p-6 max-h-[85vh] overflow-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 text-center mb-6 flex items-center justify-center gap-2">
            <FaTrophy /> תוצאות סופיות
          </h2>

          {letterGrid && <LetterGrid letterGrid={letterGrid} />}

          {/* Podium for Top 3 */}
          <div className="flex justify-center items-end gap-4 mb-8 min-h-[200px]">
            {/* 2nd Place */}
            {sortedScores[1] && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="mb-2 text-center">
                  <span className="text-2xl font-bold text-gray-300">🥈 {sortedScores[1].username}</span>
                  <div className="text-lg font-bold text-white">{sortedScores[1].score} נק'</div>
                </div>
                <div className="w-24 h-32 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg shadow-lg flex items-end justify-center pb-2 border-t border-gray-200">
                  <span className="text-4xl font-black text-white/50">2</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {sortedScores[0] && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center z-10"
              >
                <FaCrown className="text-4xl text-yellow-400 mb-2 animate-bounce" />
                <div className="mb-2 text-center">
                  <span className="text-3xl font-bold text-yellow-300">🥇 {sortedScores[0].username}</span>
                  <div className="text-xl font-bold text-white">{sortedScores[0].score} נק'</div>
                </div>
                <div className="w-28 h-40 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg shadow-xl flex items-end justify-center pb-2 border-t border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                  <span className="text-5xl font-black text-white/50">1</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {sortedScores[2] && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="mb-2 text-center">
                  <span className="text-2xl font-bold text-orange-300">🥉 {sortedScores[2].username}</span>
                  <div className="text-lg font-bold text-white">{sortedScores[2].score} נק'</div>
                </div>
                <div className="w-24 h-24 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg shadow-lg flex items-end justify-center pb-2 border-t border-orange-300">
                  <span className="text-4xl font-black text-white/50">3</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* List for remaining players */}
          <div className="space-y-3">
            {sortedScores.map((player, index) => (
              <PlayerScore key={player.username} player={player} index={index} />
            ))}
          </div>

          {gameCode && onReturnToRoom && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                onClick={onReturnToRoom}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] font-bold text-lg px-8 w-full sm:w-auto"
              >
                חזור לחדר הפעיל {isAutoReplayCancelled ? '' : `(${autoReplayCountdown})`}
              </Button>

              {!isAutoReplayCancelled && (
                <Button
                  variant="ghost"
                  onClick={() => setIsAutoReplayCancelled(true)}
                  className="text-gray-400 hover:text-white"
                >
                  בטל מעבר אוטומטי
                </Button>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
