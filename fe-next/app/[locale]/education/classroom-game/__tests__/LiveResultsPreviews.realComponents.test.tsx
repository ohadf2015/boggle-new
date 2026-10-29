import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const search = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search.value) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/components/education/live/EduHostResults', () => ({ default: () => null }));
vi.mock('@/components/education/live/EduStudentResults', () => ({ default: () => <div data-testid="real-student-results" /> }));
vi.mock('@/components/education/ClassroomResultsCard', () => ({ ClassroomResultsCard: () => <div data-testid="legacy-results-card" /> }));
vi.mock('@/components/education/live/EduStudentHero', () => ({ EduStudentHero: () => null }));
vi.mock('@/components/education/economy/LockerGrid', () => ({ default: () => null }));

import { PhoneResultsPreview } from '../LiveResultsPreviews';

describe('LiveResultsPreviews phone', () => {
  it('given the old /multiplayer card query, when the phone preview renders, then it still shows the student results /education/live mounts', () => {
    search.value = 'path=legacy';
    render(<PhoneResultsPreview />);
    expect(screen.getByTestId('real-student-results')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-results-card')).toBeNull();
  });
});
