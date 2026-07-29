import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
  }),
}));

vi.mock('next/script', () => ({
  __esModule: true,
  default: ({ children, ...p }: any) => <script {...p}>{children}</script>,
}));

import { EducationFAQ } from '../EducationFAQ';

describe('<EducationFAQ>', () => {
  it('renders 8 questions', () => {
    render(<EducationFAQ />);
    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(8);
  });

  it('emits FAQPage JSON-LD script tag', () => {
    const { container } = render(<EducationFAQ />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const obj = JSON.parse(script!.textContent || '{}');
    expect(obj['@type']).toBe('FAQPage');
    expect(obj.mainEntity).toHaveLength(8);
  });
});
