import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import { StudentWordBank } from '../StudentWordBank';

const bank = ['river', 'planet', 'cat', 'igneous'];

describe('StudentWordBank', () => {
  it('renders nothing for core', () => {
    const { container } = render(<StudentWordBank level="core" words={bank} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for support when the bank is empty (no drawer with no words)', () => {
    const { container } = render(<StudentWordBank level="support" words={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('support: collapsed drawer titled "Word bank (N)"; tapping expands to list every word in large type', () => {
    render(<StudentWordBank level="support" words={bank} />);

    const toggle = screen.getByRole('button', { name: /education\.wordBank\.title/ });
    expect(toggle).toHaveTextContent('education.wordBank.title:{"count":4}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('river')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('list');
    const items = list.querySelectorAll('li');
    expect(Array.from(items).map((li) => li.textContent)).toEqual(['river', 'planet', 'cat', 'igneous']);
    expect(items[0].className).toMatch(/text-(lg|xl|2xl)/);

    fireEvent.click(toggle);
    expect(screen.queryByText('river')).not.toBeInTheDocument();
  });

  it('support: uses a fixed bottom-sheet surface with a dark-only background (no cream FOUC pair)', () => {
    render(<StudentWordBank level="support" words={bank} />);
    const sheet = screen.getByTestId('student-word-bank');
    expect(sheet.className).toMatch(/\bfixed\b/);
    expect(sheet.className).toMatch(/bottom-0/);
    expect(sheet.className).toMatch(/bg-neo-navy/);
    expect(sheet.className).not.toMatch(/dark:bg-neo-navy/);
  });

  it('challenge: renders a small badge with the longer-word target and no drawer', () => {
    render(<StudentWordBank level="challenge" words={bank} />);
    expect(screen.getByText('education.wordBank.challengeBadge:{"min":5}')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('challenge: the badge honours a custom target length', () => {
    render(<StudentWordBank level="challenge" words={bank} challengeMinLength={6} />);
    expect(screen.getByText('education.wordBank.challengeBadge:{"min":6}')).toBeInTheDocument();
  });
});
