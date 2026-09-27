// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GamePageSeoContent } from '../GamePageSeoContent';

const props = {
  title: 'Free Word Game',
  description: 'Play a real-time multiplayer word game in your browser.',
  features: ['Real-time multiplayer', 'Daily challenge'],
  faq: [{ question: 'Is it free?', answer: 'Yes, completely free.' }],
};

describe('GamePageSeoContent', () => {
  // Regression guard for the 2026-07-27 AdSense "Low value content" fix:
  // the content card must be VISIBLE by default. Rendering it sr-only on
  // app-shell pages was the #1 rejection cause — hidden to human reviewers.
  it('renders visible content by default (no sr-only)', () => {
    const { container } = render(<GamePageSeoContent {...props} />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.className).not.toContain('sr-only');
    expect(container.querySelector('.sr-only')).toBeNull();
  });

  it('renders title, description, features, and FAQ visibly', () => {
    const { container } = render(<GamePageSeoContent {...props} />);
    expect(container.textContent).toContain('Free Word Game');
    expect(container.textContent).toContain('real-time multiplayer word game');
    expect(container.textContent).toContain('Daily challenge');
    expect(container.textContent).toContain('Is it free?');
    expect(container.textContent).toContain('completely free');
  });

  it('keeps the sr-only escape hatch when explicitly requested', () => {
    const { container } = render(<GamePageSeoContent {...props} srOnly />);
    const section = container.querySelector('section');
    expect(section!.className).toContain('sr-only');
  });

  it('renders h2 by default and h1 when asH1 is set', () => {
    const { container: c1 } = render(<GamePageSeoContent {...props} />);
    expect(c1.querySelector('h2')).not.toBeNull();
    expect(c1.querySelector('h1')).toBeNull();
    const { container: c2 } = render(<GamePageSeoContent {...props} asH1 />);
    expect(c2.querySelector('h1')).not.toBeNull();
  });

  // 2026-07-28 player-feedback fix: on game screens (/daily, /multiplayer,
  // /singleplayer) the marketing card sat in players' faces when they came to
  // PLAY. `collapsible` keeps every word in the DOM for AdSense reviewers and
  // crawlers (native <details>, no hidden-text signal) but renders the card
  // collapsed so the game is the first thing players see.
  it('renders a collapsed <details> with all content in the DOM when collapsible', () => {
    const { container } = render(<GamePageSeoContent {...props} collapsible />);
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    // Collapsed by default — no `open` attribute.
    expect(details!.hasAttribute('open')).toBe(false);
    // Title acts as the visible accordion label.
    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toContain('Free Word Game');
    // Full copy still in the DOM (AdSense reviewers + crawlers see it).
    expect(container.textContent).toContain('real-time multiplayer word game');
    expect(container.textContent).toContain('Daily challenge');
    expect(container.textContent).toContain('completely free');
    // Nothing visually hidden.
    expect(container.querySelector('.sr-only')).toBeNull();
  });

  it('preserves the heading level inside the summary when collapsible', () => {
    const { container } = render(<GamePageSeoContent {...props} asH1 collapsible />);
    const summary = container.querySelector('summary');
    expect(summary!.querySelector('h1')).not.toBeNull();
  });

  // 2026-08-08 fix: on game screens the EXPANDED collapsible card was a
  // multi-viewport wall of text that took over the whole screen once opened
  // (reported: "seo sections that hides all the screen"). When open the card
  // must be capped to a fraction of the viewport and scroll INTERNALLY so it
  // can never hide the page. The title/summary stays a fixed, always-reachable
  // toggle above the scroll region so players can collapse it back.
  it('caps the expanded collapsible body height and scrolls it internally', () => {
    const { container } = render(<GamePageSeoContent {...props} collapsible />);
    // The bound lives on the body div (the <details> content slot is not
    // constrained by a height on the element itself — Chromium quirk), so the
    // card can never grow past ~60dvh + summary and take over the screen.
    const body = container.querySelector('section > details > div') as HTMLElement;
    expect(body).not.toBeNull();
    expect(body.className).toContain('max-h-[60dvh]');
    expect(body.className).toContain('overflow-y-auto');
    // The summary/title stays a full-height, always-reachable collapse toggle
    // above the scroll region — it must NOT be inside the capped/scrolled body.
    const summary = container.querySelector('section > details > summary') as HTMLElement;
    expect(summary).not.toBeNull();
    expect(summary.textContent).toContain('Free Word Game');
  });

  it('does not render <details> when collapsible is not set', () => {
    const { container } = render(<GamePageSeoContent {...props} />);
    // Only the FAQ items use <details> — the outer card must not be one.
    expect(container.querySelector('section > details')).toBeNull();
  });
});
