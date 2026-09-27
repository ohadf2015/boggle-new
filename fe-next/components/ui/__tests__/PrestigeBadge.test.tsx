import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrestigeBadge from '../PrestigeBadge';

describe('PrestigeBadge', () => {
  it('renders nothing for level 0', () => {
    const { container } = render(<PrestigeBadge level={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for level > 5 (invalid)', () => {
    const { container } = render(<PrestigeBadge level={6} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders icon and roman numeral for level 1', () => {
    render(<PrestigeBadge level={1} />);
    // Bronze star icon from PRESTIGE_CONFIG.DISPLAY[1]
    expect(screen.getByText('⭐')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('renders roman numeral V for level 5', () => {
    render(<PrestigeBadge level={5} />);
    expect(screen.getByText('🌌')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('renders roman numerals for levels 2-4', () => {
    const { rerender } = render(<PrestigeBadge level={2} />);
    expect(screen.getByText('II')).toBeInTheDocument();

    rerender(<PrestigeBadge level={3} />);
    expect(screen.getByText('III')).toBeInTheDocument();

    rerender(<PrestigeBadge level={4} />);
    expect(screen.getByText('IV')).toBeInTheDocument();
  });

  it('applies size-xs classes by default', () => {
    const { container } = render(<PrestigeBadge level={1} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/text-\[9px\]|text-xs/);
  });

  it('applies size-sm classes when size="sm"', () => {
    const { container } = render(<PrestigeBadge level={2} size="sm" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/text-xs|text-sm/);
  });

  it('has accessible label with tier name', () => {
    render(<PrestigeBadge level={3} />);
    const badge = screen.getByLabelText(/Prestige III/i);
    expect(badge).toBeInTheDocument();
  });

  it('hides roman numeral when hideLabel is true', () => {
    render(<PrestigeBadge level={1} hideLabel />);
    expect(screen.queryByText('I')).not.toBeInTheDocument();
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });
});
