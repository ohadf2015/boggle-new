import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSignOutAlt } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { AchievementBadge } from './components/AchievementBadge';
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
    <h3 className="text-lg font-bold text-indigo-600 mb-3">
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
            className="aspect-square flex items-center justify-center text-sm sm:text-base font-bold bg-indigo-600 text-white rounded-md shadow-sm"
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

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.2 }}
    >
      <Card
        className={cn(
          "p-4 mb-3",
          index === 0 && "scale-105",
          isPodium && "text-white"
        )}
        style={{
          background: isPodium ? PODIUM_COLORS[index] : 'white',
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">
            {podiumIcon} {player.username}
          </h3>
          <span className="text-3xl font-bold">{player.score}</span>
        </div>

        <p className="text-sm mb-1">
          מילים שנמצאו: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} תקינות)`}
        </p>

        {player.longestWord && (
          <p className="text-sm mb-2">
            המילה הארוכה ביותר: <strong>{player.longestWord}</strong>
          </p>
        )}

        {player.allWords && player.allWords.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold mb-2">מילים:</p>
            <div className="flex flex-wrap gap-2">
              {player.allWords.map((wordObj, i) => (
                <WordChip key={i} wordObj={wordObj} index={i} />
              ))}
            </div>
          </div>
        )}

        {player.achievements && player.achievements.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold mb-2">הישגים:</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 flex flex-col items-center p-4 sm:p-6 overflow-auto">
      <div className="absolute top-5 right-5">
        <Button
          variant="destructive"
          onClick={handleExitRoom}
          className="font-bold"
        >
          <FaSignOutAlt className="mr-2" />
          יציאה מהחדר
        </Button>
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title mb-5"
      >
        <span className="text text-5xl sm:text-6xl md:text-7xl">Boggle</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-4xl"
      >
        <Card className="p-4 sm:p-6 max-h-[85vh] overflow-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-yellow-500 text-center mb-6 flex items-center justify-center gap-2">
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
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600 font-bold text-lg px-8"
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
