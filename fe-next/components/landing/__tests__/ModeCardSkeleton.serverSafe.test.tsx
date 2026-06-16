import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModeCardSkeleton } from '../ModeCardSkeleton';

/**
 * Server-safety: ModeCardSkeleton must render with NO LanguageContext provider/mock,
 * so it can be used inside the zero-JS server route skeleton (app/[locale]/loading.tsx).
 * Deliberately does NOT mock '@/contexts/LanguageContext'.
 */
describe('ModeCardSkeleton — server-safe (no LanguageContext)', () => {
  it('renders without a LanguageProvider and does not throw', () => {
    expect(() => render(<ModeCardSkeleton variant="cyan" />)).not.toThrow();
    expect(screen.getByTestId('mode-card-skeleton')).toBeInTheDocument();
  });
});
