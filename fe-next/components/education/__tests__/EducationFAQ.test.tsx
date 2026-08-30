import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

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
    const { container } = render(<EducationFAQ />);
    expect(container.querySelectorAll('details summary')).toHaveLength(8);
  });

  it('ships every answer in the initial HTML, not only once expanded', () => {
    // Native <details> keeps collapsed answers in the DOM. The previous
    // `{isOpen && ...}` markup omitted them entirely, so crawlers and AI answer
    // engines reading the served HTML saw eight questions and zero answers.
    const { container } = render(<EducationFAQ />);
    const answers = container.querySelectorAll('details > div');
    expect(answers).toHaveLength(8);
    expect(answers[0].textContent).toContain('education.landing.faq.q1.a');
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
