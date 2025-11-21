import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSignOutAlt, FaCrown, FaMedal } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { AchievementBadge } from './components/AchievementBadge';
import confetti from 'canvas-confetti';
import './style/animation.scss';
import { cn } from './lib/utils';

const PODIUM_COLORS = [
  'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)',
  'linear-gradient(45deg, #C0C0C0 30%, #E8E8E8 90%)',
  'linear-gradient(45deg, #CD7F32 30%, #D4A76A 90%)',
];

const WORD_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

const LetterGrid = ({ letterGrid }) => (
  <div className="mb-6 text-center">
    <h3 className="text-lg font-bold text-cyan-400 mb-3">
      לוח המשחק
    </h3>
    <div
      className="grid gap-1 max-w-xs mx-auto"
      style={{
        gridTemplateColumns: `repeat(${letterGrid[0]?.length || 7}, minmax(30px, 1fr))`,
      }}
    >
      {letterGrid.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            className="aspect-square flex items-center justify-center text-sm sm:text-base font-bold bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-md shadow-sm border border-cyan-400/30"
          >
            {cell}
          </div>
        ))
      )}
    </div>
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
  const isPodium = index < 3;
  const podiumIcon = ['🥇', '🥈', '🥉'][index] || `#${index + 1}`;

  const getNeonPodiumStyle = (idx) => {
    if (idx === 0) return 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
    if (idx === 1) return 'bg-gradient-to-r from-gray-400/80 to-gray-500/80 border-gray-400/50';
    if (idx === 2) return 'bg-gradient-to-r from-orange-500/80 to-orange-600/80 border-orange-400/50';
    return 'bg-slate-700/50 border-slate-600/50';
  };

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.2 }}
    >
      <Card
        className={cn(
          "p-4 mb-3 border backdrop-blur-md text-white",
          index === 0 && "scale-105",
          getNeonPodiumStyle(index)
        )}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">
            {podiumIcon} {player.username}
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
  const handleExitRoom = () => {
    if (window.confirm('האם אתה בטוח שברצונך לצאת מהחדר?')) {
      window.location.reload();
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center p-4 sm:p-6 overflow-auto">
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
        <Card className="p-4 sm:p-6 max-h-[85vh] overflow-auto bg-slate-800/90 backdrop-blur-md border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 text-center mb-6 flex items-center justify-center gap-2">
            <FaTrophy /> תוצאות סופיות
          </h2>

          {letterGrid && <LetterGrid letterGrid={letterGrid} />}

          {sortedScores.map((player, index) => (
            <PlayerScore key={player.username} player={player} index={index} />
          ))}

          {gameCode && onReturnToRoom && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={onReturnToRoom}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] font-bold text-lg px-8"
              >
                חזור לחדר הפעיל
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
