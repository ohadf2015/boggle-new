/**
 * Shared types for Daily Buzz Admin components
 */

export type RegenerableField = 'prompt' | 'answer' | 'hint' | 'options' | 'all';

export interface BuzzChallengeAdmin {
  type: string;
  trend_topic: string;
  prompt: string;
  answer: string;
  hint?: string;
  difficulty: string;
  trending_context?: string;
  options?: string[];
}

export interface TrendingTopicAdmin {
  query: string;
  search_volume?: number;
}

export interface DailyBuzzDataAdmin {
  puzzle_date: string;
  language: string;
  trending_summary: string;
  challenges: BuzzChallengeAdmin[];
  trending_topics: TrendingTopicAdmin[];
}

export interface PromptExample {
  id: string;
  challengeType: string;
  originalPrompt: string;
  originalAnswer: string;
  feedback: string;
  improvedPrompt?: string;
  improvedAnswer?: string;
  trendTopic?: string;
  isIncluded: boolean;
}

export interface PromptPreviewResponse {
  success: boolean;
  data: {
    aiPrompt: string;
    availableExamples: PromptExample[];
    selectedExampleCount: number;
    fieldsToRegenerate: RegenerableField[];
  };
}

export interface RegenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeIndex: number | null;
  challengeData: DailyBuzzDataAdmin | null;
  onRegenerateSuccess: (updatedData: DailyBuzzDataAdmin, message: string) => void;
}

export const CHALLENGE_TYPE_ICONS: Record<string, string> = {
  anagram: '\uD83D\uDD00',
  fill_blank: '\uD83D\uDCDD',
  word_chain: '\uD83D\uDD17',
  definition_match: '\uD83C\uDFAF',
  trending_trio: '3\uFE0F\u20E3',
  riddle: '\uD83E\uDDE9',
  wordle_guess: '\uD83D\uDFE9',
};

export const FIELD_LABELS: Record<RegenerableField, string> = {
  all: 'Everything',
  prompt: 'Prompt/Clue',
  answer: 'Answer',
  hint: 'Hint',
  options: 'Options',
};
