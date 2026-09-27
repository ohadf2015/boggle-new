import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TowerNotice } from '../TowerNotice';

describe('TowerNotice', () => {
  it('renders title with kicker and detail lines', () => {
    render(<TowerNotice tone="cyan" kicker="ENTERED" title="SKY" detail="50m and climbing" />);
    expect(screen.getByText('ENTERED')).toBeInTheDocument();
    expect(screen.getByText('SKY')).toBeInTheDocument();
    expect(screen.getByText('50m and climbing')).toBeInTheDocument();
  });

  it('is a polite live region by default, assertive when asked', () => {
    const { rerender } = render(<TowerNotice tone="lime" title="CLUTCH!" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    rerender(<TowerNotice tone="red" title="RUINED" assertive />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies the tone surface classes', () => {
    render(<TowerNotice tone="yellow" title="NEW BEST" />);
    expect(screen.getByRole('status').className).toContain('bg-neo-yellow');
  });

  it('pops on entry, runs the shared exit keyframe when exiting', () => {
    const { rerender } = render(<TowerNotice tone="cyan" title="ZONE" />);
    expect(screen.getByRole('status').className).toContain('animate-neo-pop');
    rerender(<TowerNotice tone="cyan" title="ZONE" exiting />);
    expect(screen.getByRole('status').className).toContain('wt-toast-out');
  });

  it('shakes instead of popping for alarm beats', () => {
    render(<TowerNotice tone="red" title="RUINED" shake assertive />);
    expect(screen.getByRole('status').className).toContain('animate-neo-shake');
  });

  it('renders no animation classes under reduced motion', () => {
    render(<TowerNotice tone="cyan" title="ZONE" reducedMotion shake />);
    const cls = screen.getByRole('status').className;
    expect(cls).not.toContain('animate-neo-pop');
    expect(cls).not.toContain('animate-neo-shake');
    expect(cls).not.toContain('wt-toast-out');
  });
});
