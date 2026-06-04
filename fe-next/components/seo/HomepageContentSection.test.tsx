// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomepageContentSection } from './HomepageContentSection';

// AdSense low-value-content remediation (2026-06-04):
// The homepage's only prose used to live in a `sr-only` (visually hidden) block.
// A human AdSense reviewer landing on the game homepage saw no readable content.
// This section renders the SAME copy VISIBLY so the reviewer (and users) see a
// real "About / How to play / FAQ" publisher section below the game, plus links
// into the editorial surface. See docs/2026-06-04-adsense-approval-plan.md.

const content = {
  title: 'LexiClash — Free Multiplayer Word Game Online',
  description: 'LexiClash is a free online multiplayer word game that combines grid hunting with real-time play.',
  features: ['Real-time multiplayer battles', 'Six game modes', 'Five language support'],
  faq: [
    { question: 'What is LexiClash?', answer: 'A free multiplayer word game.' },
    { question: 'Is it free?', answer: 'Yes, completely free.' },
  ],
};

describe('HomepageContentSection', () => {
  it('renders the description prose VISIBLY (not inside an sr-only block)', () => {
    const { container } = render(<HomepageContentSection content={content} locale="en" />);
    const text = screen.getByText(content.description);
    expect(text).toBeTruthy();
    // No ancestor may be visually-hidden — the whole point is reviewer-visible content.
    expect(container.querySelector('.sr-only')).toBeNull();
  });

  it('renders every feature', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    for (const f of content.features) {
      expect(screen.getByText(f), `feature: ${f}`).toBeTruthy();
    }
  });

  it('renders every FAQ question and answer', () => {
    render(<HomepageContentSection content={content} locale="en" />);
    for (const item of content.faq) {
      expect(screen.getByText(item.question), `q: ${item.question}`).toBeTruthy();
      expect(screen.getByText(item.answer), `a: ${item.answer}`).toBeTruthy();
    }
  });

  it('links into the editorial surface with locale-prefixed hrefs', () => {
    render(<HomepageContentSection content={content} locale="he" />);
    const hrefs = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/he/how-to-play');
    expect(hrefs).toContain('/he/blog');
    expect(hrefs).toContain('/he/guides');
  });
});
