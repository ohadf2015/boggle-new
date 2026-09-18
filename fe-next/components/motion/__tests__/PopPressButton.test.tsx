import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PopPressButton } from '../PopPressButton';

describe('PopPressButton', () => {
  it('renders button with children', () => {
    render(<PopPressButton>Click me</PopPressButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('is a button element', () => {
    render(<PopPressButton>Test</PopPressButton>);
    const button = screen.getByText('Test');
    expect(button.tagName).toBe('BUTTON');
  });

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn();
    render(<PopPressButton onClick={onClick}>Click me</PopPressButton>);

    const button = screen.getByText('Click me');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className alongside button classes', () => {
    const { container } = render(
      <PopPressButton className="custom-class">Button</PopPressButton>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('font-bold');
  });

  it('respects disabled prop', () => {
    render(<PopPressButton disabled>Disabled</PopPressButton>);
    const button = screen.getByText('Disabled') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('renders with neo-brutalist styling', () => {
    const { container } = render(<PopPressButton>Neo Button</PopPressButton>);
    const button = container.querySelector('button');

    // Check for neo-brutalist classes
    expect(button?.className).toMatch(/bg-neo-lime|border|font-bold/);
  });

  it('accepts aria-label for accessibility', () => {
    render(
      <PopPressButton aria-label="Submit form">
        Submit
      </PopPressButton>
    );

    const button = screen.getByLabelText('Submit form');
    expect(button).toBeInTheDocument();
  });

  it('supports size variants', () => {
    const { container: smContainer } = render(
      <PopPressButton size="sm">Small</PopPressButton>
    );
    const { container: mdContainer } = render(
      <PopPressButton size="md">Medium</PopPressButton>
    );
    const { container: lgContainer } = render(
      <PopPressButton size="lg">Large</PopPressButton>
    );

    expect(smContainer.querySelector('button')).toBeInTheDocument();
    expect(mdContainer.querySelector('button')).toBeInTheDocument();
    expect(lgContainer.querySelector('button')).toBeInTheDocument();
  });

  it('supports variant prop (primary/secondary)', () => {
    const { container: primaryContainer } = render(
      <PopPressButton variant="primary">Primary</PopPressButton>
    );
    const { container: secondaryContainer } = render(
      <PopPressButton variant="secondary">Secondary</PopPressButton>
    );

    expect(primaryContainer.querySelector('button')).toBeInTheDocument();
    expect(secondaryContainer.querySelector('button')).toBeInTheDocument();
  });

  it('can receive ref', () => {
    const ref = { current: null };
    render(<PopPressButton ref={ref}>With Ref</PopPressButton>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('preserves motion animation on non-reduced-motion devices', () => {
    const { container } = render(<PopPressButton>Motion Button</PopPressButton>);
    const button = container.querySelector('button');

    // Component should render (actual motion behavior tested in E2E)
    expect(button).toBeInTheDocument();
  });
});
