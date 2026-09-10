// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EducationIntentCta } from '../EducationIntentCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('EducationIntentCta', () => {
  it('on the Spanish high-traffic page links teachers to ESL word games', () => {
    render(<EducationIntentCta locale="es" variant="esl" />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((a) => a.getAttribute('href') || '');
    expect(hrefs).toContain('/es/education/esl-word-games');
    expect(screen.getByText('education.intentCta.forTeachers')).toBeTruthy();
  });

  it('on English game pages links the hub and one relevant subpage', () => {
    render(<EducationIntentCta locale="en" variant="teachers" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') || '');
    expect(hrefs).toContain('/en/education');
    expect(hrefs.some((h) => h.includes('/en/education/'))).toBe(true);
  });
});
