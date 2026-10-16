import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LessonPicker } from '../LessonPicker';

/**
 * The lesson picker must count the lesson, not the board.
 *
 * `canIntegrate` is false for anything under 3 or over 12 letters — a Boggle
 * grid rule (hooks/wordIntegrationLogic.ts). Counting with it here made a
 * ten-word lesson read "9 words" next to its own checkbox, one screen after the
 * editor said 10, with nothing anywhere naming the missing word. Measured live
 * 2026-09-07 on "Ecology Vocabulary Audit" ("photosynthesis" is 14 letters).
 */
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}|${JSON.stringify(params)}` : k,
    language: 'en',
  }),
}));

const lesson = {
  id: 'l1',
  name: 'Ecology Vocabulary Audit',
  words: [
    { word: 'photosynthesis', canIntegrate: false }, // no board holds 14 letters
    { word: 'osmosis', canIntegrate: true },
  ],
} as never;

describe('LessonPicker — the count next to a lesson', () => {
  it('counts every word the teacher put in the lesson', () => {
    render(
      <LessonPicker mode="multi" lessons={[lesson]} selectedIds={[]} onChange={vi.fn()} />
    );
    expect(screen.getByRole('checkbox')).toHaveTextContent('2 education.lesson.words|{"count":2}');
  });
});
