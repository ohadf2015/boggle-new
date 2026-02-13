'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowLeft } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import PracticeResultsCard from './PracticeResultsCard';
import { useMatchingGame, type MatchingItem } from './hooks/useMatchingGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export interface WordMatchingPracticeProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number; accuracy: number }) => void;
  onBack: () => void;
}

interface DraggableWordCardProps {
  item: MatchingItem;
  isMatched: boolean;
}

const DraggableWordCard = memo<DraggableWordCardProps>(({ item, isMatched }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: isMatched,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-4 rounded-neo border-neo border-neo-black',
        'bg-neo-cyan text-neo-black font-neo-display text-lg',
        'shadow-hard hover:shadow-hard-lg transition-shadow',
        'cursor-move select-none',
        isMatched && 'opacity-50 cursor-not-allowed',
        isDragging && 'opacity-50 z-50',
        !isMatched && 'touch-none'
      )}
    >
      {item.text}
    </div>
  );
});

DraggableWordCard.displayName = 'DraggableWordCard';

interface DroppableDefinitionSlotProps {
  item: MatchingItem;
  isMatched: boolean;
  feedback: 'correct' | 'incorrect' | null;
}

const DroppableDefinitionSlot = memo<DroppableDefinitionSlotProps>(({
  item,
  isMatched,
  feedback,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'p-4 rounded-neo border-neo',
        'font-neo-body text-base min-h-[4rem] flex items-center justify-center',
        'transition-all relative',
        isMatched && 'border-neo-green bg-neo-green/10',
        !isMatched && 'border-neo-black bg-neo-white/5',
        isOver && !isMatched && 'bg-neo-cyan/20 border-neo-cyan',
        feedback === 'correct' && 'border-neo-green bg-neo-green/20',
        feedback === 'incorrect' && 'border-neo-pink bg-neo-pink/20 animate-neo-shake'
      )}
    >
      <span className="text-neo-white text-center">{item.text}</span>

      {isMatched && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-neo-green rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-neo-black" />
        </div>
      )}

      {feedback === 'incorrect' && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-neo-pink rounded-full flex items-center justify-center">
          <X className="w-4 h-4 text-neo-white" />
        </div>
      )}
    </div>
  );
});

DroppableDefinitionSlot.displayName = 'DroppableDefinitionSlot';

export const WordMatchingPractice = memo<WordMatchingPracticeProps>(
  ({ words, onComplete, onBack }) => {
    const { t, dir } = useLanguage();
    const isRTL = dir === 'rtl';

    const {
      wordColumn,
      definitionColumn,
      matchedPairs,
      attempts,
      correctCount,
      isComplete,
      accuracy,
      checkMatch,
      resetGame,
    } = useMatchingGame(words);

    const [feedback, setFeedback] = useState<Record<string, 'correct' | 'incorrect'>>({});
    const [showResults, setShowResults] = useState(false);

    // Configure sensors for drag and drop
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Handle drag end
    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const wordId = active.id as string;
        const definitionText = definitionColumn.find((d) => d.id === over.id)?.text;

        if (!definitionText) return;

        const result = checkMatch(wordId, definitionText);

        if (result.correct) {
          // Show correct feedback
          setFeedback((prev) => ({ ...prev, [over.id as string]: 'correct' }));

          // Clear feedback after animation
          setTimeout(() => {
            setFeedback((prev) => {
              const next = { ...prev };
              delete next[over.id as string];
              return next;
            });
          }, 1000);
        } else {
          // Show incorrect feedback
          setFeedback((prev) => ({ ...prev, [over.id as string]: 'incorrect' }));

          // Clear feedback after animation
          setTimeout(() => {
            setFeedback((prev) => {
              const next = { ...prev };
              delete next[over.id as string];
              return next;
            });
          }, 1000);
        }
      },
      [definitionColumn, checkMatch]
    );

    // Show results when complete
    useMemo(() => {
      if (isComplete && !showResults && words.length > 0) {
        setTimeout(() => {
          setShowResults(true);
        }, 500);
      }
    }, [isComplete, showResults, words.length]);

    // Handle restart
    const handleRestart = useCallback(() => {
      resetGame();
      setShowResults(false);
      setFeedback({});
    }, [resetGame]);

    // Handle completion
    const handleComplete = useCallback(() => {
      onComplete({
        correct: correctCount,
        total: attempts,
        accuracy,
      });
    }, [correctCount, attempts, accuracy, onComplete]);

    if (showResults) {
      return (
        <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
          <PracticeResultsCard
            correct={correctCount}
            total={attempts}
            onRestart={handleRestart}
            onBack={handleComplete}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-neo-navy p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label={t('common.back')}
              className="text-neo-white/70 hover:text-neo-white hover:bg-neo-white/10"
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-neo-display text-neo-white mb-1">
                {t('education.practice.matching.title') || 'Match Words & Definitions'}
              </h2>
              <p className="text-neo-white/70 font-neo-body">
                {matchedPairs.size} / {words.length}
              </p>
            </div>

            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Matching area */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div
            data-testid="dnd-context"
            className={cn(
              'max-w-5xl mx-auto grid gap-6',
              words.length < 4 ? 'grid-cols-2 max-w-2xl' : 'md:grid-cols-2'
            )}
          >
            {/* Word column */}
            <div className="space-y-3">
              <h3 className="text-sm font-neo-display text-neo-white/60 uppercase tracking-wide mb-3">
                {t('education.practice.matching.words') || 'Words'}
              </h3>
              <AdaptiveMotion className="space-y-3">
                {wordColumn.map((item) => (
                  <DraggableWordCard
                    key={item.id}
                    item={item}
                    isMatched={matchedPairs.has(item.id)}
                  />
                ))}
              </AdaptiveMotion>
            </div>

            {/* Definition column */}
            <div className="space-y-3">
              <h3 className="text-sm font-neo-display text-neo-white/60 uppercase tracking-wide mb-3">
                {t('education.practice.matching.definitions') || 'Definitions'}
              </h3>
              <AdaptiveMotion className="space-y-3">
                {definitionColumn.map((item) => (
                  <DroppableDefinitionSlot
                    key={item.id}
                    item={item}
                    isMatched={matchedPairs.has(item.id)}
                    feedback={feedback[item.id] || null}
                  />
                ))}
              </AdaptiveMotion>
            </div>
          </div>
        </DndContext>
      </div>
    );
  }
);

WordMatchingPractice.displayName = 'WordMatchingPractice';

export default WordMatchingPractice;
