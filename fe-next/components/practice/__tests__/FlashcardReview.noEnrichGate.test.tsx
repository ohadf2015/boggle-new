/**
 * Practice must start from the words the teacher typed. Immediately.
 *
 * FlashcardReview used to set `isEnriching`, emit `enrichVocabulary` over the
 * socket, and clear the flag ONLY inside the `vocabularyEnriched` handler.
 * No server handler for `enrichVocabulary` exists anywhere in the repo — the
 * sole emitter of `vocabularyEnriched` was a test mock — so every student with
 * a live socket sat on a spinner forever, on every lesson. Pitfall class 4: a
 * wait for a reply that can never arrive.
 *
 * The gate is gone. These tests pin that it stays gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlashcardReview from '../FlashcardReview';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: mockSocket }),
}));
vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), isSpeaking: false }),
}));
vi.mock('../PronunciationButton', () => ({ PronunciationButton: () => null }));
vi.mock('../FlashcardSwipeStack', () => ({ FlashcardSwipeStack: () => <div /> }));

const WORDS: VocabularyWord[] = [
  { word: 'hesitant', definition: 'not sure about doing something', canIntegrate: true },
  { word: 'reluctant', definition: 'unwilling', canIntegrate: true },
];

const renderIt = () =>
  render(<FlashcardReview words={WORDS} onComplete={vi.fn()} onBack={vi.fn()} />);

beforeEach(() => vi.clearAllMocks());

describe('FlashcardReview never waits on enrichment', () => {
  it('shows the first card straight away, with a live socket attached', () => {
    renderIt();
    expect(screen.getByText('hesitant')).toBeInTheDocument();
  });

  it('never renders the enriching spinner', () => {
    renderIt();
    expect(screen.queryByText('education.lesson.enrichingContent')).not.toBeInTheDocument();
    expect(screen.queryByText(/Enriching/i)).not.toBeInTheDocument();
  });

  it('does not emit into the void — no handler for enrichVocabulary exists', () => {
    renderIt();
    const emitted = mockSocket.emit.mock.calls.map(([event]: [string]) => event);
    expect(emitted).not.toContain('enrichVocabulary');
  });

  it('subscribes to no enrichment reply that can never come', () => {
    renderIt();
    const listened = mockSocket.on.mock.calls.map(([event]: [string]) => event);
    expect(listened).not.toContain('vocabularyEnriched');
  });

  it('renders from the teacher’s own words, definitions included', () => {
    renderIt();
    expect(screen.getByText('hesitant')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
