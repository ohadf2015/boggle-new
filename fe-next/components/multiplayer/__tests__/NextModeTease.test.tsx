import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextModeTease from '../NextModeTease';

// t echoes the key so we can assert which keys are rendered.
const t = (key: string) => key;

describe('NextModeTease', () => {
  it('renders the upcoming mode label and its hook tease', () => {
    render(<NextModeTease mode="blast" t={t} />);
    expect(screen.getByText('results.modeTease.label.blast')).toBeInTheDocument();
    expect(screen.getByText('results.modeTease.hook.blast')).toBeInTheDocument();
  });

  it('shows a localized "next up" eyebrow label', () => {
    render(<NextModeTease mode="classic" t={t} />);
    expect(screen.getByText('results.modeTease.nextUp')).toBeInTheDocument();
  });

  it('applies the mode-specific electric colour family for visual identity', () => {
    const { container } = render(<NextModeTease mode="word-hunt" t={t} />);
    // word-hunt → cyan family
    expect(container.querySelector('[class*="neo-cyan"]')).not.toBeNull();
  });

  it('uses a DISTINCT colour for a different mode (not a fixed accent)', () => {
    const { container } = render(<NextModeTease mode="wheel-rush" t={t} />);
    // wheel-rush → purple family
    expect(container.querySelector('[class*="neo-purple"]')).not.toBeNull();
  });

  it('falls back to a generic tease for an unknown / random mode', () => {
    render(<NextModeTease mode="random" t={t} />);
    expect(screen.getByText('results.modeTease.hook.random')).toBeInTheDocument();
  });

  it('renders nothing when mode is null (no upcoming mode known yet)', () => {
    const { container } = render(<NextModeTease mode={null} t={t} />);
    expect(container.firstChild).toBeNull();
  });
});
