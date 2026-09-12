'use client';

/**
 * PracticeModeStage — the one place that decides which practice screen renders.
 *
 * This switch used to live inside the lesson page, which had grown to 554 lines
 * and mixed three unrelated jobs: fetching a lesson, owning the XP session, and
 * routing eight practice modes. Pulling the routing out is what got that page
 * back under the file-size cap and left it doing one thing.
 *
 * Every mode is handed the same two forward props — `onNext` and `nextLabel` —
 * so the big green button at the end of a round belongs to the completion card
 * itself rather than to a separate bar bolted underneath it. That matters: the
 * old design put "practise again" on the card and "next game" on a fixed strip
 * at the bottom of the viewport, so the two halves of the same decision lived
 * 400px apart and one of them was routinely off-screen on a phone.
 *
 * Word Tower is the one special case. It records as `solo_board` (there is no
 * `word_tower` value in the practice_type CHECK constraint), so the variant is
 * what decides which of the two screens opens.
 */

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
import type { PracticeType } from '@/hooks/usePracticeSession';
import type { PracticeVariant } from '@/lib/education/practicePicker';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

export interface PracticeRoundPayload {
  focus?: VocabFocus;
  cardsReviewed?: number;
  cardsCorrect?: number;
  vocabularyWordsFound?: string[];
  newWordsFound?: string[];
}

export interface PracticeModeStageProps {
  mode: PracticeType;
  variant: PracticeVariant | null;
  focus: VocabFocus | null;
  lessonName: string;
  language: Language;
  words: VocabularyWord[];
  /** Normalised round-finished handler — one path for all eight modes. */
  onFinish: (type: PracticeType, payload: PracticeRoundPayload) => void | Promise<void>;
  onBack: () => void;
  xpSessionData: { sessionXpEarned: number; sessionMasteryMessage: string | null };
  /** Straight into the next ready mode, when the lesson has one left. */
  onNext?: () => void;
  nextLabel?: string;
}

export default function PracticeModeStage({
  mode,
  variant,
  focus,
  lessonName,
  language,
  words,
  onFinish,
  onBack,
  xpSessionData,
  onNext,
  nextLabel,
}: PracticeModeStageProps) {
  if (words.length === 0) return null;

  const common = { lessonName, words, language, onBack };
  const forward = { onNext, nextLabel };

  switch (mode) {
    case 'flashcard':
      return (
        <FlashcardReview
          words={words}
          onComplete={(results) =>
            onFinish('flashcard', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'solo_board':
      if (variant === 'word_tower') {
        return (
          <WordTowerPractice
            words={words.map((entry) => entry.word)}
            language={language}
            onComplete={async (results) => {
              // Deliberately NOT followed by onBack(): Word Tower now holds the
              // screen and shows its own completion moment, where the old code
              // unmounted it the instant the result was recorded.
              await onFinish('solo_board', {
                vocabularyWordsFound: results.vocabularyWordsFound,
                newWordsFound: [],
              });
            }}
            onBack={onBack}
            {...forward}
          />
        );
      }
      return (
        <SoloPracticeBoard
          {...common}
          onComplete={(results) =>
            onFinish('solo_board', {
              vocabularyWordsFound: results.vocabularyWordsFound,
              newWordsFound: [],
            })
          }
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'word_list':
      return <WordListPreview {...common} />;

    case 'warmup':
      return (
        <WarmupRound
          {...common}
          onComplete={(results) =>
            onFinish('solo_board', {
              vocabularyWordsFound: results.vocabularyWordsFound,
              newWordsFound: [],
            })
          }
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'matching':
      return (
        <WordMatchingPractice
          words={words}
          onComplete={(results) =>
            onFinish('matching', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'spelling':
      return (
        <SpellingChallengePractice
          words={words}
          onComplete={(results) =>
            onFinish('spelling', { cardsReviewed: results.total, cardsCorrect: results.correct })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'blitz':
      return (
        <TimedBlitzPractice
          words={words}
          onComplete={(results) =>
            onFinish('blitz', {
              cardsReviewed: results.wordsAttempted,
              cardsCorrect: results.wordsFound,
            })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
          {...forward}
        />
      );

    case 'vocab_focus': {
      const resolved = focus ?? availableFocuses(words, { language })[0] ?? 'definition';
      return (
        <VocabFocusPractice
          words={words}
          focus={resolved}
          language={language}
          onComplete={(results) =>
            onFinish('vocab_focus', {
              focus: results.focus,
              cardsReviewed: results.total,
              cardsCorrect: results.correct,
            })
          }
          onBack={onBack}
          xpSessionData={xpSessionData}
          {...forward}
        />
      );
    }

    default:
      return null;
  }
}
