import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import WarmupRound from '../WarmupRound';
import type { VocabularyWord } from '@/lib/supabase/education';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

const gridProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/components/GridComponent', () => ({
  default: (props: Record<string, unknown>) => {
    gridProps.current = props;
    return <div data-testid="grid" />;
  },
}));

vi.mock('@/hooks/useContainerDimensions', () => ({
  useContainerDimensions: () => ({ containerRef: { current: null }, dimensions: { width: 360, height: 360 }, isReady: true }),
}));

const words: VocabularyWord[] = [
  { word: 'happy', canIntegrate: true },
  { word: 'brave', canIntegrate: true },
];

describe('WarmupRound - mascot reactions', () => {
  let events: MascotEvent[];

  beforeEach(() => {
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  const submit = (word: string) =>
    act(() => {
      (gridProps.current.onWordSubmit as (w: string) => void)(word);
    });

  it('GIVEN a new word WHEN it is played THEN the mascot hears it with its length and no word text', () => {
    render(<WarmupRound lessonName="Unit 3" words={words} language="en" onComplete={vi.fn()} onBack={vi.fn()} />);
    submit('happy');
    expect(events).toEqual([{ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false }]);
  });

  it('GIVEN a word already found WHEN it is played again THEN the mascot hears a duplicate', () => {
    render(<WarmupRound lessonName="Unit 3" words={words} language="en" onComplete={vi.fn()} onBack={vi.fn()} />);
    submit('happy');
    submit('happy');
    expect(events[1]).toEqual({ kind: 'duplicate-word' });
  });
});
