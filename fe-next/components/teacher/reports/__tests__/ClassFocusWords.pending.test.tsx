import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassFocusWords } from '../ClassFocusWords';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));
vi.mock('@/components/teacher/reports/useWordMasteryReport', () => ({
  useWordMasteryReport: () => ({ status: 'error' }),
  useRosterNames: () => ({}),
}));

describe('ClassFocusWords while the class metrics are still loading', () => {
  it('keeps its loading block instead of offering "Start a game" to a class whose missed words have not arrived yet', () => {
    // Given the word report has no words and the fallback list is still loading
    render(<ClassFocusWords classroomId="c1" classroomName="7B" fallback={[]} fallbackPending surface="reports" />);

    // Then it still shows loading, not an empty-class call to action
    expect(screen.getByTestId('class-focus-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('class-focus-start')).toBeNull();
  });

  it('offers a game once the fallback has answered empty', () => {
    render(<ClassFocusWords classroomId="c1" classroomName="7B" fallback={[]} surface="reports" />);
    expect(screen.getByTestId('class-focus-start')).toBeInTheDocument();
  });
});
