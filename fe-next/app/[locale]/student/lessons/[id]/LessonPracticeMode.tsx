'use client';

import {
  FlashcardReview,
  SoloPracticeBoard,
  WordListPreview,
  WarmupRound,
  WordMatchingPractice,
  SpellingChallengePractice,
  TimedBlitzPractice,
  VocabFocusPractice,
} from '@/components/practice';
import WordTowerPractice from '@/components/education/practicePicker/WordTowerPractice';
import { availableFocuses, type VocabFocus } from '@/lib/education/vocabFocus';
import type { CompletePracticeSessionData } from '@/components/education/PracticeSessionProvider';
import type { PracticeVariant } from '@/lib/education/practicePicker';
import type { PracticeType } from '@/hooks/usePracticeSession';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

interface LessonPracticeModeProps {
  selectedMode: PracticeType;
  selectedVariant: PracticeVariant | null;
  selectedFocus: VocabFocus | null;
  lessonName: string;
  language: Language;
  practiceWords: VocabularyWord[];
  xpSessionData: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
  onBack: () => void;
  finishRound: (
    type: CompletePracticeSessionData['type'],
    payload: {
      focus?: VocabFocus;
      cardsReviewed?: number;
      cardsCorrect?: number;
      vocabularyWordsFound?: string[];
      newWordsFound?: string[];
    },
  ) => void | Promise<void>;
}

export function LessonPracticeMode({
  selectedMode,
  selectedVariant,
  selectedFocus,
  lessonName,
  language,
  practiceWords,
  xpSessionData,
  onBack,
  finishRound,
}: LessonPracticeModeProps) {
  if (practiceWords.length === 0) return null;

  const commonProps = {
    lessonName,
    words: practiceWords,
    language,
    onBack,
  };

  switch (selectedMode) {
    case 'flashcard':
      return (
        <FlashcardReview
          words={practiceWords}
          onComplete={(results) =>
            finishRound('flashcard', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
        />
      );
    case 'solo_board':
      if (selectedVariant === 'word_tower') {
        return (
          <WordTowerPractice
            words={practiceWords.map((entry) => entry.word)}
            language={language}
            onComplete={(results) =>
              finishRound('solo_board', {
                vocabularyWordsFound: results.vocabularyWordsFound,
                newWordsFound: [],
              })
            }
            onBack={onBack}
          />
        );
      }
      return (
        <SoloPracticeBoard
          {...commonProps}
          onComplete={(results) =>
            finishRound('solo_board', {
              vocabularyWordsFound: results.vocabularyWordsFound,
              newWordsFound: [],
            })
          }
          xpSessionData={xpSessionData}
        />
      );
    case 'word_list':
      return <WordListPreview {...commonProps} onBack={onBack} />;
    case 'warmup':
      return (
        <WarmupRound
          {...commonProps}
          onComplete={(results) =>
            finishRound('solo_board', {
              vocabularyWordsFound: results.vocabularyWordsFound,
              newWordsFound: [],
            })
          }
          xpSessionData={xpSessionData}
        />
      );
    case 'matching':
      return (
        <WordMatchingPractice
          words={practiceWords}
          onComplete={(results) =>
            finishRound('matching', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
        />
      );
    case 'spelling':
      return (
        <SpellingChallengePractice
          words={practiceWords}
          onComplete={(results) =>
            finishRound('spelling', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
        />
      );
    case 'blitz':
      return (
        <TimedBlitzPractice
          words={practiceWords}
          onComplete={(results) =>
            finishRound('blitz', {
              cardsReviewed: results.wordsAttempted,
              cardsCorrect: results.wordsFound,
            })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
        />
      );
    case 'vocab_focus': {
      const focus =
        selectedFocus ??
        availableFocuses(practiceWords, { language })[0] ??
        'definition';
      return (
        <VocabFocusPractice
          words={practiceWords}
          focus={focus}
          language={language}
          onComplete={(results) =>
            finishRound('vocab_focus', {
              focus: results.focus,
              cardsReviewed: results.total,
              cardsCorrect: results.correct,
            })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
        />
      );
    }
    default:
      return null;
  }
}
