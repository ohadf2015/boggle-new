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
});
