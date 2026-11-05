import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { EducationLandingFaq } from '../EducationLandingFaq';

const ITEMS = [
  { question: 'Q one?', answer: 'A one.' },
  { question: 'Q two?', answer: 'A two.' },
  { question: 'Q three?', answer: 'A three.' },
];

describe('EducationLandingFaq', () => {
  it('keeps the #faq anchor and renders every item as an open-able details row with its answer in the DOM', () => {
    const { container } = render(<EducationLandingFaq locale="en" items={ITEMS} />);
    const section = container.querySelector('section#faq');
    expect(section).not.toBeNull();
    const rows = section!.querySelectorAll('details');
    expect(rows).toHaveLength(3);
    ITEMS.forEach((item, i) => {
      expect(within(rows[i] as HTMLElement).getByText(item.question).closest('summary')).not.toBeNull();
      expect(within(rows[i] as HTMLElement).getByText(item.answer)).toBeTruthy();
    });
  });

  it('puts the heading, a lead line and a help link in a side column beside the list on wide screens', () => {
    const { container } = render(<EducationLandingFaq locale="en" items={ITEMS} />);
    const grid = container.querySelector('[data-testid="landing-faq-grid"]');
    expect(grid?.className).toMatch(/lg:grid-cols-/);
    const aside = within(grid as HTMLElement).getByTestId('landing-faq-aside');
    expect(aside.className).toMatch(/lg:sticky/);
    expect(within(aside).getByRole('heading', { level: 2, name: 'Teacher questions' })).toBeTruthy();
    expect(within(aside).getByText(/before their first class/i)).toBeTruthy();
    const help = within(aside).getByRole('link', { name: /help center/i });
    expect(help.getAttribute('href')).toBe('/en/education/help');
  });

  it('localises the copy and the help link', () => {
    render(<EducationLandingFaq locale="he" items={ITEMS} />);
    expect(screen.getByRole('heading', { level: 2, name: 'שאלות של מורים' })).toBeTruthy();
    expect(screen.getByTestId('landing-faq-help').getAttribute('href')).toBe('/he/education/help');
    expect(screen.getByTestId('landing-faq-help').textContent).not.toMatch(/help center/i);
  });
});
