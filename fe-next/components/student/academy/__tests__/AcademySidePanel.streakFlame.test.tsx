import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AcademySidePanel } from '../AcademySidePanel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => f ?? k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));

describe('AcademySidePanel streak flame', () => {
  it('shows the tiered flame for the day streak', () => {
    render(<AcademySidePanel title="Class" streak={4} boss={null} chest={null} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'flame');
  });
});
