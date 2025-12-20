'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaFire, FaRedo, FaPlay, FaCheck } from 'react-icons/fa';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface DemoWord {
  word: string;
  path: [number, number][];
  points: number;
}

interface InteractiveGridDemoProps {
  t: (key: string) => string;
  dir: string;
}

/**
 * Interactive Mini Grid Demo Component
 * Auto-plays words with combo demonstration
 */
export const InteractiveGridDemo: React.FC<InteractiveGridDemoProps> = ({ t, dir }) => {
  const demoGrid = [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ];

  const demoSequence: DemoWord[] = [
    { word: 'CAT', path: [[0,0], [0,1], [0,2]], points: 2 },
    { word: 'RAT', path: [[1,1], [0,1], [0,2]], points: 2 },
    { word: 'ART', path: [[0,1], [1,1], [0,2]], points: 2 },
    { word: 'CARS', path: [[0,0], [0,1], [1,1], [1,2]], points: 3 },
  ];

  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentDemo = demoSequence[currentWordIndex] ?? demoSequence[0] ?? { word: '', path: [], points: 0 };

  const getComboMultiplier = (combo: number): number => {
    if (combo <= 2) return 1;
    if (combo <= 4) return 1.25;
    if (combo <= 6) return 1.5;
    return 1.75;
  };

  const animateWord = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowSuccess(false);
    const currentWord = demoSequence[currentWordIndex];
    if (!currentWord) return;

    currentWord.path.forEach((cell, index) => {
      setTimeout(() => {
        setSelectedCells(prev => [...prev, cell]);
      }, index * 300);
    });

    setTimeout(() => {
      setShowSuccess(true);
      const multiplier = getComboMultiplier(comboCount + 1);
      const points = Math.floor(currentWord.points * multiplier);
      setTotalScore(prev => prev + points);
      setComboCount(prev => prev + 1);

      setTimeout(() => {
        setSelectedCells([]);
        setShowSuccess(false);
        setIsAnimating(false);
        setCurrentWordIndex((prev) => (prev + 1) % demoSequence.length);

        if (currentWordIndex === demoSequence.length - 1) {
          setTimeout(() => {
            setComboCount(0);
            setTotalScore(0);
          }, 500);
        }
      }, 1200);
    }, currentWord.path.length * 300 + 400);
  }, [currentWordIndex, isAnimating, comboCount]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(animateWord, 800);
    return () => clearTimeout(timer);
  }, [animateWord, autoPlay, currentWordIndex]);

  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(([r, c]) => r === row && c === col);
  };

  const getCellIndex = (row: number, col: number): number => {
    return selectedCells.findIndex(([r, c]) => r === row && c === col);
  };

  const handleReplay = (): void => {
    setSelectedCells([]);
    setCurrentWordIndex(0);
    setComboCount(0);
    setTotalScore(0);
    setShowSuccess(false);
    setIsAnimating(false);
    setAutoPlay(true);
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      {/* Combo & Score Display */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {comboCount > 0 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1"
          >
            <FaFire className={`${comboCount >= 3 ? 'text-neo-orange animate-pulse' : 'text-gray-400'}`} />
            <Badge className={`${comboCount >= 3 ? 'bg-neo-orange' : 'bg-gray-300'} text-neo-black border-2 border-neo-black font-bold text-xs`}>
              {comboCount}x Combo {comboCount >= 3 && `(${getComboMultiplier(comboCount)}×)`}
            </Badge>
          </motion.div>
        )}
        {totalScore > 0 && (
          <motion.div
            key={totalScore}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            <Badge className="bg-neo-yellow text-neo-black border-2 border-neo-black font-bold text-xs">
              {t('results.points')}: {totalScore}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Demo Grid */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-2 sm:p-3 bg-neo-black/10 rounded-neo border-2 sm:border-3 border-neo-black">
          {demoGrid.map((row, rowIndex) => (
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const cellIndex = getCellIndex(rowIndex, colIndex);

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center relative
                    text-lg sm:text-xl font-black uppercase
                    rounded-neo border-2 sm:border-3 border-neo-black
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-neo-yellow text-neo-black shadow-hard scale-110 z-10'
                      : 'bg-neo-cream text-neo-black shadow-hard-sm'
                    }
                  `}
                  animate={isSelected ? { scale: [1, 1.15, 1.1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {letter}
                  {isSelected && cellIndex >= 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-neo-pink text-neo-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center border-2 border-neo-black"
                    >
                      {cellIndex + 1}
                    </motion.span>
                  )}
                </motion.div>
              );
            })
          ))}
        </div>

        {/* Connection Lines SVG Overlay */}
        {selectedCells.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ margin: '8px' }}>
            {selectedCells.slice(1).map((cell, i) => {
              const prev = selectedCells[i];
              if (!prev) return null;
              const prevCol = prev[1];
              const prevRow = prev[0];
              const cellCol = cell[1];
              const cellRow = cell[0];
              if (prevCol === undefined || prevRow === undefined || cellCol === undefined || cellRow === undefined) return null;
              const cellSize = 52;
              const gap = 6;
              const x1 = prevCol * (cellSize + gap) + cellSize / 2;
              const y1 = prevRow * (cellSize + gap) + cellSize / 2;
              const x2 = cellCol * (cellSize + gap) + cellSize / 2;
              const y2 = cellRow * (cellSize + gap) + cellSize / 2;

              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF6B9D"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Current Word Display */}
      <div className="flex items-center gap-2">
        <div className="bg-neo-cream px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm min-w-[80px] text-center">
          <span className="font-black text-neo-black text-base sm:text-lg tracking-wider">
            {selectedCells.length > 0
              ? selectedCells.map(([r, c]) => demoGrid[r]?.[c] ?? '').join('')
              : currentDemo.word}
          </span>
        </div>
        {showSuccess && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-neo-lime"
          >
            <FaCheck className="text-lg" />
            <span className="font-bold text-sm">+{currentDemo.points}</span>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        {autoPlay ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(false)}
            className="bg-neo-cream text-[10px] sm:text-xs px-2 py-1"
          >
            <FaPlay className="mr-1 text-[10px]" />
            {t('howToPlay.demo.pause') || 'Pause'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(true)}
            className="bg-neo-cream text-[10px] sm:text-xs px-2 py-1"
          >
            <FaPlay className="mr-1 text-[10px]" />
            {t('howToPlay.demo.play') || 'Play'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          className="bg-neo-cream text-[10px] sm:text-xs px-2 py-1"
        >
          <FaRedo className="mr-1 text-[10px]" />
          {t('howToPlay.demo.replay') || 'Replay'}
        </Button>
      </div>
    </div>
  );
};

export default InteractiveGridDemo;
