import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { TimedBlitzPractice } from '../TimedBlitzPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));
vi.mock('@/components/education/practice/usePracticeSfx', () => ({
  usePracticeSfx: () => ({ correct() {}, wrong() {}, start() {}, urgent() {}, timesUp() {}, advance() {}, match() {}, hint() {} }),
}));

const words = [
  { word: 'סתיו', definition: 'עונה', language: 'he' },
  { word: 'אביב', definition: 'עונה אחרת', language: 'he' },
] as unknown as VocabularyWord[];

describe('TimedBlitzPractice typing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps typed text while the clock ticks', () => {
    render(<TimedBlitzPractice words={words} onComplete={() => {}} onBack={() => {}} />);
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(500); });
    const input = screen.getByTestId('word-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'סת' } });
    expect(input.value).toBe('סת');
    act(() => { vi.advanceTimersByTime(3000); });
    expect((screen.getByTestId('word-input') as HTMLInputElement).value).toBe('סת');
  });

  it('does not rewrite the field on a clock tick when the keyboard changed it without telling React', () => {
    // Android Gboard (Hebrew) edits the field through composition; React can lag
    // behind the DOM value. A controlled field then gets overwritten on the next render.
    render(<TimedBlitzPractice words={words} onComplete={() => {}} onBack={() => {}} />);
    for (const ms of [1000, 1000, 1000, 500]) act(() => { vi.advanceTimersByTime(ms); });
    const input = screen.getByTestId('word-input') as HTMLInputElement;
    input.value = 'סי';
    act(() => { vi.advanceTimersByTime(2000); });
    expect((screen.getByTestId('word-input') as HTMLInputElement).value).toBe('סי');
  });

  it('submits what is in the field, clears it, and enables Send only with text', () => {
    render(<TimedBlitzPractice words={words} onComplete={() => {}} onBack={() => {}} />);
    for (const ms of [1000, 1000, 1000, 500]) act(() => { vi.advanceTimersByTime(ms); });
    const input = screen.getByTestId('word-input') as HTMLInputElement;
    const send = screen.getByRole('button') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'x' } });
    expect(send.disabled).toBe(false);
    fireEvent.submit(input.closest('form')!);
    expect(input.value).toBe('');
    expect(send.disabled).toBe(true);
  });
});
