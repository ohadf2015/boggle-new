'use client';

import PracticePicker from '@/components/education/practicePicker/PracticePicker';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const w = (word: string, definition: string, synonym: string, antonym: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  definition,
  canIntegrate: true,
  synonyms: [synonym],
  antonyms: [antonym],
  example: `The ___ one was ${word}.`,
  ...extra,
});

const WORDS: VocabularyWord[] = [
  w('happy', 'feeling joy', 'glad', 'sad', { meanings: ['feeling joy', 'pleased with a result'], morphology: { root: 'hap', suffix: 'y', rootMeaning: 'luck' } }),
  w('brave', 'not afraid', 'bold', 'scared', { meanings: ['not afraid', 'facing something hard'] }),
  w('quick', 'moving fast', 'rapid', 'slow', { meanings: ['moving fast', 'smart and alert'] }),
  w('tiny', 'very small', 'little', 'huge'),
  w('loud', 'making a lot of noise', 'noisy', 'quiet', { morphology: { root: 'loud' } }),
  w('bright', 'full of light', 'shiny', 'dark', { meanings: ['full of light', 'clever'] }),
  w('unkind', 'not nice to others', 'mean', 'kind', { morphology: { root: 'kind', prefix: 'un', rootMeaning: 'nice' } }),
  w('careful', 'taking care', 'cautious', 'careless', { morphology: { root: 'care', suffix: 'ful', rootMeaning: 'attention' } }),
];

const noop = () => {};

/** Every practice tile unlocked, so the whole art set renders at once. */
export function PracticePickerPreview() {
  return (
    <main className="min-h-dvh bg-edu-page p-4">
      <PracticePicker lessonName="Unit 3 vocabulary" words={WORDS} language="en" onSelectMode={noop} onBack={noop} />
    </main>
  );
}
