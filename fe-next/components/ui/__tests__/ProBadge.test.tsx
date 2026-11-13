import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProBadge } from '../ProBadge';

describe('ProBadge', () => {
  it('renders the label with a crown and the gold foil class', () => {
    render(<ProBadge label="Pro" data-testid="b" />);
    const badge = screen.getByTestId('b');
    expect(badge).toHaveTextContent('Pro');
    expect(badge.className).toMatch(/\bpro-badge\b/);
    expect(badge.getAttribute('data-pro-badge')).toBe('sm');
    expect(badge.querySelector('svg')).not.toBeNull();
  });

  it('carries a decorative shine layer that screen readers skip', () => {
    render(<ProBadge label="Pro" data-testid="b" />);
    const shine = screen.getByTestId('b').querySelector('.pro-badge__shine');
    expect(shine).not.toBeNull();
    expect(shine?.getAttribute('aria-hidden')).toBe('true');
  });

  it('switches size via a modifier class', () => {
    render(<ProBadge label="Pro" size="lg" data-testid="b" />);
    const badge = screen.getByTestId('b');
    expect(badge.className).toMatch(/\bpro-badge--lg\b/);
    expect(badge.getAttribute('data-pro-badge')).toBe('lg');
  });

  it('can drop the crown for tight spots and keeps caller classes', () => {
    render(<ProBadge label="Pro" crown={false} className="ms-auto" data-testid="b" />);
    const badge = screen.getByTestId('b');
    expect(badge.querySelector('svg')).toBeNull();
    expect(badge.className).toContain('ms-auto');
  });

  it('never shouts in caps (Hebrew and Japanese have no case; English stays "Pro")', () => {
    render(<ProBadge label="Pro" data-testid="b" />);
    expect(screen.getByTestId('b').className).not.toMatch(/\buppercase\b/);
  });
});
