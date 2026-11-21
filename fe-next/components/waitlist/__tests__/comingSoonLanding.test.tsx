import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

import { ComingSoonLanding } from '../ComingSoonLanding';
import { arContent } from '@/app/[locale]/laabat-kalimat-arabiya/content';
import { enContent } from '@/app/[locale]/arabic-word-game/content';

describe.each([
  ['arabic', arContent],
  ['english', enContent],
])('%s coming-soon layout', (_n, content) => {
  it('hides the board tiles from screen readers and describes the board in text', () => {
    const { container } = render(<ComingSoonLanding content={content} />);
    const board = container.querySelector('[data-board]');
    expect(board).toHaveAttribute('aria-hidden', 'true');
    expect(board?.querySelectorAll('[data-tile]').length).toBe(16);
    expect(screen.getByText(content.hero.boardAlt)).toBeInTheDocument();
  });

  it('shows the coming-soon stamp on the board', () => {
    const { container } = render(<ComingSoonLanding content={content} />);
    expect(container.querySelector('[data-stamp]')).toHaveTextContent(content.hero.stamp);
  });

  it('puts the waitlist form before the steps', () => {
    const { container } = render(<ComingSoonLanding content={content} />);
    const html = container.innerHTML;
    expect(html.indexOf('type="email"')).toBeGreaterThan(-1);
    expect(html.indexOf('type="email"')).toBeLessThan(html.indexOf(content.steps.heading));
  });

  it('renders the steps as numbered cards with titles', () => {
    render(<ComingSoonLanding content={content} />);
    const list = screen.getByRole('list', { name: content.steps.heading });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(content.steps.items.length);
    content.steps.items.forEach((s, i) => {
      expect(items[i]).toHaveTextContent(s.title);
      expect(items[i]).toHaveTextContent(String(i + 1));
    });
  });

  it('keeps every FAQ answer in the page for the FAQ schema', () => {
    render(<ComingSoonLanding content={content} />);
    for (const f of content.faqs) expect(screen.getByText(f.a)).toBeInTheDocument();
  });

  it('shows the letter-shape and hamza examples beside the explanation', () => {
    const { container } = render(<ComingSoonLanding content={content} />);
    expect(screen.getByText(content.why.forms.title)).toBeInTheDocument();
    expect(screen.getByText(content.why.hamza.title)).toBeInTheDocument();
    const text = container.textContent ?? '';
    for (const ch of ['أ', 'إ', 'آ', 'ـعـ']) expect(text).toContain(ch);
  });

  it('ends with a play-now band', () => {
    render(<ComingSoonLanding content={content} />);
    expect(screen.getByRole('link', { name: content.playNow.label })).toHaveAttribute('href', content.playNow.href);
  });
});

describe('arabic typography', () => {
  it('never uppercases or letter-spaces the Arabic headline', () => {
    render(<ComingSoonLanding content={arContent} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).not.toMatch(/\b(uppercase|tracking-[\w-]+)\b/);
  });
});
