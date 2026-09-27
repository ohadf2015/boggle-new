'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Scene 1: Create a classroom form with auto-typing name field
 */
export function TourScene1() {
  const { t } = useLanguage();
  const [displayedName, setDisplayedName] = useState('');
  const targetName = 'Alex'; // Decorative student name (data, not UI text)

  useEffect(() => {
    if (displayedName.length < targetName.length) {
      const timer = setTimeout(() => {
        setDisplayedName(targetName.slice(0, displayedName.length + 1));
      }, 80);
      return () => clearTimeout(timer);
    }
    return;
  }, [displayedName]);

  return (
    <div className="space-y-4" data-testid="tour-scene-1">
      <div className="space-y-2">
        <label className="block text-xs font-black uppercase text-neo-white/70">
          {t('education.tour.classroomNameLabel')}
        </label>
        <input
          type="text"
          value={displayedName}
          readOnly
          className={cn(
            'w-full px-3 py-2 rounded-neo border-2 border-neo-black',
            'bg-neo-white text-neo-black font-neo-body',
            'focus:outline-none focus:ring-2 focus:ring-neo-lime'
          )}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-black uppercase text-neo-white/70">
          {t('education.tour.languageFocusLabel')}
        </label>
        <select className={cn(
          'w-full px-3 py-2 rounded-neo border-2 border-neo-black',
          'bg-neo-white text-neo-black font-neo-body'
        )}>
          <option>{t('education.tour.englishLearnersOption')}</option>
        </select>
      </div>

      <button className={cn(
        'w-full px-4 py-2 rounded-neo border-2 border-neo-black',
        'bg-neo-lime text-neo-black font-neo-display font-black uppercase text-sm',
        'shadow-hard'
      )}>
        {t('education.tour.createClassroomButton')}
      </button>
    </div>
  );
}

/**
 * Scene 2: Join code reveal with QR-ish visual
 */
export function TourScene2() {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 text-center" data-testid="tour-scene-2">
      <p className="text-neo-white/80 text-sm">
        {t('education.tour.shareCodeText')}
      </p>

      <div className={cn(
        'mx-auto relative inline-block',
        'animate-in fade-in duration-700',
        revealed && 'opacity-100'
      )}>
        <div className="bg-neo-lime border-4 border-neo-black rounded-neo p-8 shadow-hard">
          <div className="font-mono font-black text-5xl text-neo-black tracking-widest">
            AB7X2K
          </div>
        </div>
        <p className="mt-4 text-xs font-black uppercase text-neo-white/60">
          {t('education.tour.codeFormatLabel')}
        </p>
      </div>

      <div className="bg-neo-white/10 border-2 border-neo-white/50 rounded-neo p-3">
        <p className="text-xs text-neo-white/80">
          {t('education.tour.enterCodeOnPhonesText')}
        </p>
      </div>
    </div>
  );
}

/**
 * Scene 3: Three student phones joining with names popping in
 */
export function TourScene3() {
  const { t } = useLanguage();
  const [joinedCount, setJoinedCount] = useState(0);

  useEffect(() => {
    if (joinedCount < 3) {
      const timer = setTimeout(() => setJoinedCount(joinedCount + 1), 1200);
      return () => clearTimeout(timer);
    }
    return;
  }, [joinedCount]);

  const students = [
    { id: 1, name: 'Alex', color: 'bg-neo-cyan' }, // Decorative student name (data)
    { id: 2, name: 'Jamie', color: 'bg-neo-pink' }, // Decorative student name (data)
    { id: 3, name: 'Morgan', color: 'bg-neo-lime' }, // Decorative student name (data)
  ];

  return (
    <div className="space-y-4" data-testid="tour-scene-3">
      <p className="text-center text-neo-white/80 text-sm mb-4">
        {t('education.tour.studentsJoinOneByOneText')}
      </p>

      <div className="space-y-2">
        {students.map((student, i) => (
          <div
            key={student.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-neo border-2 border-neo-white/60',
              'bg-neo-navy transition-all duration-300',
              i < joinedCount ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            )}
            style={{
              transitionDelay: i < joinedCount ? `${i * 100}ms` : '0ms',
            }}
          >
            <div className={cn('w-8 h-8 rounded-full border-2 border-neo-black', student.color)} />
            <span className="font-neo-display font-black text-neo-white">{student.name}</span>
            {i < joinedCount && (
              <span className="ms-auto text-xs font-black uppercase text-neo-lime">
                {t('education.tour.studentJoinedBadge')}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 text-center text-xs text-neo-white/60">
        {t('education.tour.nStudentsJoinedText', '', { count: joinedCount })}
      </div>
    </div>
  );
}

/**
 * Scene 4: Letter grid with word path lighting up and score ticking
 */
export function TourScene4() {
  const { t } = useLanguage();
  const [pathProgress, setPathProgress] = useState(0);
  const [scoreValue, setScoreValue] = useState(0);

  useEffect(() => {
    if (pathProgress < 4) {
      const timer = setTimeout(() => setPathProgress(pathProgress + 1), 400);
      return () => clearTimeout(timer);
    } else if (scoreValue < 25) {
      const timer = setTimeout(() => setScoreValue(scoreValue + 3), 50);
      return () => clearTimeout(timer);
    }
    return;
  }, [pathProgress, scoreValue]);

  const grid = [
    ['H', 'W', 'O', 'Z'],
    ['E', 'E', 'R', 'K'],
    ['L', 'L', 'D', 'P'],
    ['P', 'O', 'S', 'Q'],
  ];

  const wordPath = [[0, 0], [1, 0], [1, 1], [1, 2]]; // H-E-L-L-O path (data, not UI text)

  const isInPath = (row: number, col: number) => {
    return wordPath.some(([r, c]) => r === row && c === col);
  };

  const getPathIndex = (row: number, col: number) => {
    return wordPath.findIndex(([r, c]) => r === row && c === col);
  };

  return (
    <div className="space-y-6" data-testid="tour-scene-4">
      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-2">
          {grid.map((row, rowIdx) =>
            row.map((letter, colIdx) => {
              const pathIdx = getPathIndex(rowIdx, colIdx);
              const isHighlighted = pathIdx !== -1 && pathIdx < pathProgress;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={cn(
                    'w-12 h-12 flex items-center justify-center',
                    'rounded-neo border-2 font-neo-display font-black text-lg',
                    'transition-all duration-300',
                    isHighlighted
                      ? 'bg-neo-lime text-neo-black shadow-hard border-neo-black'
                      : 'bg-neo-white/20 text-neo-white border-neo-white/60'
                  )}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-neo-white/60 uppercase font-black">{t('common.word')}</p>
          <p className="text-2xl font-neo-display font-black text-neo-lime">HERO</p>
        </div>
        <div className="h-12 w-0.5 bg-neo-white/30" />
        <div className="text-center">
          <p className="text-xs text-neo-white/60 uppercase font-black">{t('common.score')}</p>
          <p className="text-2xl font-neo-display font-black text-neo-cyan">{scoreValue}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Scene 5: Results bar chart showing student performance
 */
export function TourScene5() {
  const { t } = useLanguage();
  const [barHeights, setBarHeights] = useState([0, 0, 0]);

  useEffect(() => {
    const bars = [45, 72, 38];
    bars.forEach((targetHeight, idx) => {
      const timer = setTimeout(() => {
        let currentHeight = 0;
        const increment = setInterval(() => {
          if (currentHeight < targetHeight) {
            currentHeight = Math.min(currentHeight + 5, targetHeight);
            setBarHeights((prev) => {
              const next = [...prev];
              next[idx] = currentHeight;
              return next;
            });
          } else {
            clearInterval(increment);
          }
        }, 30);
        return () => clearInterval(increment);
      }, idx * 200);
      return () => clearTimeout(timer);
    });
  }, []);

  const students = [
    { name: 'Alex', color: 'bg-neo-cyan' }, // Decorative student name (data)
    { name: 'Jamie', color: 'bg-neo-pink' }, // Decorative student name (data)
    { name: 'Morgan', color: 'bg-neo-lime' }, // Decorative student name (data)
  ];

  const maxHeight = 80;

  return (
    <div className="space-y-6" data-testid="tour-scene-5">
      <div className="text-center">
        <h3 className="font-neo-display font-black text-neo-white text-lg">
          {t('education.tour.roundResultsHeading')}
        </h3>
      </div>

      <div className="flex items-end justify-center gap-6 h-32">
        {students.map((student, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className="h-32 w-12 bg-neo-black/20 border-2 border-neo-white/40 rounded-neo-sm flex items-end overflow-hidden">
              <div
                className={cn(
                  'w-full transition-all duration-500 ease-out',
                  student.color
                )}
                style={{
                  height: `${(barHeights[idx] / maxHeight) * 100}%`,
                }}
              />
            </div>
            <p className="text-sm font-neo-display font-black text-neo-white">
              {student.name}
            </p>
            <p className="text-xs text-neo-white/60 font-black">
              {barHeights[idx]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
