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
    <div className="flex flex-col items-center gap-3 sm:gap-4 p-2 overflow-hidden">
      {/* Combo & Score Display */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center min-h-[28px]">
        {comboCount > 0 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="flex items-center gap-1.5"
          >
            <FaFire className={`text-lg ${comboCount >= 3 ? 'text-neo-orange animate-pulse drop-shadow-[0_0_8px_rgba(255,140,0,0.7)]' : 'text-gray-600'}`} />
            <Badge className={`${comboCount >= 3 ? 'bg-neo-orange shadow-[0_0_12px_rgba(255,140,0,0.5)]' : 'bg-gray-300'} text-neo-black border-2 border-neo-black font-bold text-xs sm:text-sm px-2 py-0.5`}>
              {comboCount}x Combo {comboCount >= 3 && `(${getComboMultiplier(comboCount)}×)`}
            </Badge>
          </motion.div>
        )}
        {totalScore > 0 && (
          <motion.div
            key={totalScore}
            initial={{ scale: 1.3, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Badge className="bg-neo-yellow text-neo-black border-2 border-neo-black font-bold text-xs sm:text-sm px-2 py-0.5 shadow-hard-sm">
              {t('results.points')}: {totalScore}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Demo Grid */}
      <div className="relative overflow-hidden p-2">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-3 sm:p-4 bg-gradient-to-br from-neo-navy/10 to-neo-purple/10 rounded-xl border-3 sm:border-4 border-neo-black shadow-hard-lg">
          {demoGrid.map((row, rowIndex) => (
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const cellIndex = getCellIndex(rowIndex, colIndex);

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative
                    text-xl sm:text-2xl font-black uppercase
                    rounded-xl border-3 border-neo-black
                    cursor-default select-none
                    ${isSelected
                      ? 'bg-neo-yellow text-neo-black shadow-[0_0_20px_rgba(255,235,59,0.6)] z-10'
                      : 'bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard'
                    }
                  `}
                  animate={isSelected ? { scale: 1.12 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {letter}
                  {isSelected && cellIndex >= 0 && (
                    <motion.span
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500 }}
                      className={`absolute -top-1.5 ${dir === 'rtl' ? '-left-1.5' : '-right-1.5'} w-5 h-5 sm:w-6 sm:h-6 bg-neo-pink text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center border-2 border-neo-black shadow-hard-sm`}
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
          <svg className="absolute inset-0 pointer-events-none z-20" style={{ margin: '12px' }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {selectedCells.slice(1).map((cell, i) => {
              const prev = selectedCells[i];
              if (!prev) return null;
              const prevCol = prev[1];
              const prevRow = prev[0];
              const cellCol = cell[1];
              const cellRow = cell[0];
              if (prevCol === undefined || prevRow === undefined || cellCol === undefined || cellRow === undefined) return null;
              const cellSize = 56;
              const gap = 8;
              const numCols = 3;
              const gridContentWidth = numCols * cellSize + (numCols - 1) * gap;
              const isRTL = dir === 'rtl';

              // Calculate x coordinates (flip for RTL to match CSS grid direction)
              const getX = (col: number): number => {
                const ltrX = col * (cellSize + gap) + cellSize / 2;
                return isRTL ? gridContentWidth - ltrX : ltrX;
              };

              const x1 = getX(prevCol);
              const y1 = prevRow * (cellSize + gap) + cellSize / 2;
              const x2 = getX(cellCol);
              const y2 = cellRow * (cellSize + gap) + cellSize / 2;

              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF6B9D"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Current Word Display */}
      <div className="flex items-center gap-3 min-h-[40px]">
        <motion.div
          className="bg-neo-cream px-4 py-2 rounded-xl border-3 border-neo-black shadow-hard min-w-[100px] text-center"
          animate={showSuccess ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className="font-black text-neo-black text-lg sm:text-xl tracking-wider">
            {selectedCells.length > 0
              ? selectedCells.map(([r, c]) => demoGrid[r]?.[c] ?? '').join('')
              : currentDemo.word}
          </span>
        </motion.div>
        {showSuccess && (
          <motion.div
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="flex items-center gap-1.5 bg-neo-lime/20 px-3 py-1.5 rounded-lg border-2 border-neo-lime"
          >
            <FaCheck className="text-lg text-neo-lime" />
            <span className="font-bold text-sm sm:text-base text-neo-lime">+{currentDemo.points}</span>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap justify-center mt-1">
        {autoPlay ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(false)}
            className="bg-neo-cream hover:bg-neo-cream/80 text-xs sm:text-sm px-3 py-1.5 border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
          >
            <span className={`${dir === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`}>⏸</span>
            {t('howToPlay.demo.pause') || 'Pause'}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(true)}
            className="bg-neo-lime hover:bg-neo-lime/80 text-xs sm:text-sm px-3 py-1.5 border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
          >
            <FaPlay className={`text-xs ${dir === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`} />
            {t('howToPlay.demo.play') || 'Play'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          className="bg-neo-cyan hover:bg-neo-cyan/80 text-xs sm:text-sm px-3 py-1.5 border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
        >
          <FaRedo className={`text-xs ${dir === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`} />
          {t('howToPlay.demo.replay') || 'Replay'}
        </Button>
      </div>
    </div>
  );
};

export default InteractiveGridDemo;
