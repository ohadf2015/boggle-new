'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { m } from 'framer-motion';
import { Flame, RotateCw, Play, Check } from 'lucide-react';
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
  const isRTL = dir === 'rtl';

  // LTR grid: reads left-to-right, RTL grid: reads right-to-left (mirrored)
  const demoGrid = isRTL ? [
    ['T', 'A', 'C'],
    ['S', 'R', 'O'],
    ['E', 'D', 'W']
  ] : [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ];

  // Demo paths: LTR starts left, RTL starts right
  const demoSequence: DemoWord[] = useMemo(() => isRTL ? [
    { word: 'CAT', path: [[0,2], [0,1], [0,0]], points: 10 },
    { word: 'RAT', path: [[1,1], [0,1], [0,0]], points: 10 },
    { word: 'ART', path: [[0,1], [1,1], [0,0]], points: 10 },
    { word: 'CARS', path: [[0,2], [0,1], [1,1], [1,0]], points: 20 },
  ] : [
    { word: 'CAT', path: [[0,0], [0,1], [0,2]], points: 10 },
    { word: 'RAT', path: [[1,1], [0,1], [0,2]], points: 10 },
    { word: 'ART', path: [[0,1], [1,1], [0,2]], points: 10 },
    { word: 'CARS', path: [[0,0], [0,1], [1,1], [1,2]], points: 20 },
  ], [isRTL]);

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
  }, [currentWordIndex, isAnimating, comboCount, demoSequence]);

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
    <div className="flex flex-col items-center gap-2 sm:gap-4 p-1 sm:p-2 overflow-hidden">
      {/* Combo & Score Display */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-center min-h-[24px] sm:min-h-[28px]">
        {comboCount > 0 && (
          <m.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="flex items-center gap-1"
          >
            <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${comboCount >= 3 ? 'text-neo-red animate-pulse drop-shadow-[0_0_8px_rgba(255,140,0,0.7)]' : 'text-gray-600'}`} />
            <Badge className={`${comboCount >= 3 ? 'bg-neo-red shadow-[0_0_12px_rgba(255,140,0,0.5)]' : 'bg-gray-300'} text-neo-black border sm:border-2 border-neo-black font-bold text-[10px] sm:text-sm px-1.5 sm:px-2 py-0.5 whitespace-nowrap`}>
              {comboCount}x {comboCount >= 3 && `(${getComboMultiplier(comboCount)}×)`}
            </Badge>
          </m.div>
        )}
        {totalScore > 0 && (
          <m.div
            key={totalScore}
            initial={{ scale: 1.3, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Badge className="bg-neo-lime text-neo-black border sm:border-2 border-neo-black font-bold text-[10px] sm:text-sm px-1.5 sm:px-2 py-0.5 shadow-hard-sm">
              {totalScore} pts
            </Badge>
          </m.div>
        )}
      </div>

      {/* Demo Grid - Force LTR for consistent SVG line positioning */}
      <div dir="ltr" className="relative overflow-hidden p-1 sm:p-2">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 p-2 sm:p-4 bg-linear-to-br from-neo-navy/10 to-neo-pink/10 rounded-lg sm:rounded-xl border-2 sm:border-4 border-neo-black shadow-hard-lg">
          {demoGrid.map((row, rowIndex) => (
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const cellIndex = getCellIndex(rowIndex, colIndex);

              return (
                <m.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center relative
                    text-lg sm:text-2xl font-black uppercase
                    rounded-lg sm:rounded-xl border-2 sm:border-3 border-neo-black
                    cursor-default select-none
                    ${isSelected
                      ? 'bg-neo-lime text-neo-black shadow-[0_0_20px_rgba(255,235,59,0.6)] z-10'
                      : 'bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard'
                    }
                  `}
                  animate={isSelected ? { scale: 1.12 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {letter}
                  {isSelected && cellIndex >= 0 && (
                    <m.span
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500 }}
                      className={`absolute -top-1 sm:-top-1.5 ${dir === 'rtl' ? '-left-1 sm:-left-1.5' : '-right-1 sm:-right-1.5'} w-4 h-4 sm:w-6 sm:h-6 bg-neo-pink text-white text-[9px] sm:text-xs font-bold rounded-full flex items-center justify-center border sm:border-2 border-neo-black shadow-hard-sm`}
                    >
                      {cellIndex + 1}
                    </m.span>
                  )}
                </m.div>
              );
            })
          ))}
        </div>

        {/* Connection Lines SVG Overlay */}
        {selectedCells.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none z-20 m-2 sm:m-4">
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
              // Responsive cell size based on viewport
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
              const cellSize = isMobile ? 40 : 56;
              const gap = isMobile ? 4 : 8;

              // Calculate cell centers (grid container is always LTR, no flip needed)
              const x1 = prevCol * (cellSize + gap) + cellSize / 2;
              const y1 = prevRow * (cellSize + gap) + cellSize / 2;
              const x2 = cellCol * (cellSize + gap) + cellSize / 2;
              const y2 = cellRow * (cellSize + gap) + cellSize / 2;

              return (
                <m.line
                  key={`${x1}-${y1}-${x2}-${y2}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF6B9D"
                  strokeWidth={isMobile ? 3 : 4}
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
      <div className="flex items-center gap-2 sm:gap-3 min-h-[32px] sm:min-h-[40px]">
        <m.div
          className="bg-neo-cream px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 sm:border-3 border-neo-black shadow-hard min-w-[80px] sm:min-w-[100px] text-center"
          animate={showSuccess ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className="font-black text-neo-black text-base sm:text-xl tracking-wider">
            {selectedCells.length > 0
              ? selectedCells.map(([r, c]) => demoGrid[r]?.[c] ?? '').join('')
              : currentDemo.word}
          </span>
        </m.div>
        {showSuccess && (
          <m.div
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="flex items-center gap-1 bg-neo-lime/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border sm:border-2 border-neo-lime"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-neo-lime" />
            <span className="font-bold text-xs sm:text-base text-neo-lime">+{currentDemo.points}</span>
          </m.div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
        {autoPlay ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(false)}
            className="bg-neo-cream hover:bg-neo-cream/80 text-[10px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 border sm:border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
          >
            <span className={`me-1`}>⏸</span>
            {t('howToPlay.demo.pause')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay(true)}
            className="bg-neo-lime hover:bg-neo-lime/80 text-[10px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 border sm:border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
          >
            <Play className={`w-3 h-3 sm:w-4 sm:h-4 me-1`} />
            {t('howToPlay.demo.play')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          className="bg-neo-cyan hover:bg-neo-cyan/80 text-[10px] sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 border sm:border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
        >
          <RotateCw className={`w-3 h-3 sm:w-4 sm:h-4 me-1`} />
          {t('howToPlay.demo.replay')}
        </Button>
      </div>
    </div>
  );
};

export default InteractiveGridDemo;
