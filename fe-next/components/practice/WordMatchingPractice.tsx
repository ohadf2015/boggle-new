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
import type { EnrichedVocabularyWord } from '@/types/vocabulary';
import { WordContextRow } from './WordContextRow';
import { PronunciationButton } from '@/components/practice/PronunciationButton';

export interface WordMatchingPracticeProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number; accuracy: number }) => void;
  onBack: () => void;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
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
        'font-neo-body text-base min-h-16 flex items-center justify-center',
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
  ({ words, onComplete, onBack, xpSessionData }) => {
    const { t, dir, language } = useLanguage();
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

    // Show results and report completion when game ends
    useMemo(() => {
      if (isComplete && !showResults && words.length > 0) {
        setTimeout(() => {
          setShowResults(true);
          onComplete({
            correct: correctCount,
            total: attempts,
            accuracy,
          });
        }, 500);
      }
    }, [isComplete, showResults, words.length, onComplete, correctCount, attempts, accuracy]);

    // Handle restart
    const handleRestart = useCallback(() => {
      resetGame();
      setShowResults(false);
      setFeedback({});
    }, [resetGame]);


    if (showResults) {
      return (
        <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <PracticeResultsCard
            correct={correctCount}
            total={attempts}
            xpEarned={xpSessionData?.sessionXpEarned}
            masteryMessage={xpSessionData?.sessionMasteryMessage ?? undefined}
            onRestart={handleRestart}
            onBack={onBack}
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
              className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-neo-display text-neo-white mb-1">
                {t('education.practice.matchPairs')}
              </h2>
              <div className="flex flex-col items-center gap-1">
                <p className="text-neo-white font-neo-body">
                  {matchedPairs.size} / {words.length}
                </p>
                <div className="h-1.5 w-24 bg-neo-black/30 rounded-neo overflow-hidden">
                  <AdaptiveMotion.div
                    className="h-full bg-neo-cyan"
                    animate={{ width: `${(matchedPairs.size / words.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
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
              <h3 className="text-sm font-neo-display text-neo-white uppercase tracking-wide mb-3">
                {t('education.practice.matchingWords')}
              </h3>
              <AdaptiveMotion.div className="space-y-3">
                {wordColumn.map((item) => {
                  const wordData = words.find((w) => w.word === item.id);
                  return (
                    <div key={item.id}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <DraggableWordCard
                            item={item}
                            isMatched={matchedPairs.has(item.id)}
                          />
                        </div>
                        <PronunciationButton
                          word={item.id}
                          lang={language}
                          size="sm"
                        />
                      </div>
                      <WordContextRow
                        partOfSpeech={(wordData as Partial<EnrichedVocabularyWord> | undefined)?.partOfSpeech}
                        example={(wordData as Partial<EnrichedVocabularyWord> | undefined)?.examples?.[0]?.text}
                      />
                    </div>
                  );
                })}
              </AdaptiveMotion.div>
            </div>

            {/* Definition column */}
            <div className="space-y-3">
              <h3 className="text-sm font-neo-display text-neo-white uppercase tracking-wide mb-3">
                {t('education.practice.matchingDefinitions')}
              </h3>
              <AdaptiveMotion.div className="space-y-3">
                {definitionColumn.map((item) => (
                  <DroppableDefinitionSlot
                    key={item.id}
                    item={item}
                    isMatched={matchedPairs.has(item.id)}
                    feedback={feedback[item.id] || null}
                  />
                ))}
              </AdaptiveMotion.div>
            </div>
          </div>
        </DndContext>
      </div>
    );
  }
);

WordMatchingPractice.displayName = 'WordMatchingPractice';

export default WordMatchingPractice;
