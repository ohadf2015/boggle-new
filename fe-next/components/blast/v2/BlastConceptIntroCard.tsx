'use client';
import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ConceptKey } from '@/lib/blast/v2/tutorial/unlocks-seen';

type Props = {
  concept: ConceptKey;
  modeColor?: string;
  onDismiss: () => void;
};

type DemoLetter = {
  ch: string;
  active: boolean;
};

// Visual demos for each concept. Auto-runs an animated trace highlighting
// the cells that form the example word, then waits for "Got it".
const DEMOS: Record<ConceptKey, {
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  rows: DemoLetter[][];
  highlightOrder: Array<{ row: number; col: number }>;
}> = {
  anyRow: {
    titleKey: 'blast.concept.anyRow.title',
    titleFallback: 'Words can be on any row',
    bodyKey: 'blast.concept.anyRow.body',
    bodyFallback: 'Not just the bottom row — scan the whole board for words.',
    rows: [
      // Top row (visually highest)
      [
        { ch: 'X', active: false },
        { ch: 'B', active: true },
        { ch: 'E', active: true },
        { ch: 'E', active: true },
      ],
      [
        { ch: 'M', active: false },
        { ch: 'T', active: false },
        { ch: 'I', active: false },
        { ch: 'R', active: false },
      ],
      [
        { ch: 'A', active: false },
        { ch: 'N', active: false },
        { ch: 'S', active: false },
        { ch: 'P', active: false },
      ],
    ],
    highlightOrder: [
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
  },
  verticalWords: {
    titleKey: 'blast.concept.verticalWords.title',
    titleFallback: 'Words can be vertical too',
    bodyKey: 'blast.concept.verticalWords.body',
    bodyFallback: 'Drag straight down (or up) to spell vertical words.',
    rows: [
      [
        { ch: 'L', active: true },
        { ch: 'M', active: false },
        { ch: 'A', active: false },
        { ch: 'R', active: false },
      ],
      [
        { ch: 'I', active: true },
        { ch: 'N', active: false },
        { ch: 'T', active: false },
        { ch: 'S', active: false },
      ],
      [
        { ch: 'O', active: true },
        { ch: 'E', active: false },
        { ch: 'P', active: false },
        { ch: 'N', active: false },
      ],
      [
        { ch: 'N', active: true },
        { ch: 'I', active: false },
        { ch: 'A', active: false },
        { ch: 'D', active: false },
      ],
    ],
    highlightOrder: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ],
  },
};

export function BlastConceptIntroCard({ concept, modeColor = '#BFFF00', onDismiss }: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const demo = DEMOS[concept];
  const [step, setStep] = useState(0);

  // Walk through the highlightOrder, advancing one cell per tick, then loop.
  useEffect(() => {
    if (reducedMotion) {
      setStep(demo.highlightOrder.length);
      return;
    }
    const total = demo.highlightOrder.length;
    const interval = setInterval(() => {
      setStep((s) => {
        // After holding the full trace for ~600ms, restart so the demo loops
        // until the player taps Got it.
        if (s >= total + 2) return 0;
        return s + 1;
      });
    }, 380);
    return () => clearInterval(interval);
  }, [demo, reducedMotion]);

  const isLit = (row: number, col: number) => {
    return demo.highlightOrder
      .slice(0, Math.min(step, demo.highlightOrder.length))
      .some((c) => c.row === row && c.col === col);
  };

  return (
    <m.div
      data-testid="concept-intro"
      data-concept={concept}
      initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl text-white text-center"
        style={{
          background: '#16213e',
          border: `3px solid ${modeColor}`,
          boxShadow: `6px 6px 0 #0b1530, 0 0 60px color-mix(in srgb, ${modeColor} 35%, transparent)`,
        }}
      >
        <div className="px-6 pt-6">
          <div
            className="text-[11px] uppercase tracking-[0.2em] opacity-70"
            style={{ color: modeColor }}
          >
            {t('blast.concept.tag', 'New')}
          </div>
          <h2 className="text-xl font-black mt-1">
            {t(demo.titleKey, demo.titleFallback)}
          </h2>
          <p className="text-sm opacity-85 mt-2 leading-snug">
            {t(demo.bodyKey, demo.bodyFallback)}
          </p>
        </div>
        <div className="px-6 py-6">
          <div
            className="mx-auto inline-grid gap-1.5 p-3 rounded-xl bg-black/40"
            style={{ gridTemplateColumns: `repeat(${demo.rows[0]!.length}, 38px)` }}
            aria-hidden
          >
            {demo.rows.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const lit = isLit(rIdx, cIdx);
                return (
                  <m.div
                    key={`${rIdx}-${cIdx}`}
                    animate={{
                      scale: lit ? 1.08 : 1,
                      backgroundColor: lit ? modeColor : '#f4e9d8',
                      color: lit ? '#ffffff' : '#0b1530',
                    }}
                    transition={{ duration: 0.18 }}
                    className="w-[38px] h-[38px] rounded-md font-black grid place-items-center text-base"
                    style={{
                      border: '2px solid #0b1530',
                      boxShadow: lit
                        ? `0 0 14px color-mix(in srgb, ${modeColor} 70%, transparent), 3px 3px 0 #0b1530`
                        : '3px 3px 0 #0b1530',
                    }}
                  >
                    {cell.ch}
                  </m.div>
                );
              }),
            )}
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onDismiss}
            data-testid="concept-got-it"
            className="w-full px-4 py-3 rounded-lg font-black text-lg uppercase tracking-wide"
            style={{
              background: modeColor,
              color: '#0b1530',
              boxShadow: `4px 4px 0 #0b1530`,
            }}
          >
            {t('blast.concept.gotIt', "Let's play!")}
          </button>
        </div>
      </div>
    </m.div>
  );
}
