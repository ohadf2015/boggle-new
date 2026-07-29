import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftAxisChip } from '../WordCraftAxisChip';

const labels = {
  labelHorizontal: 'Across',
  labelVertical: 'Down',
  ariaLabel: 'Flip word direction',
};

describe('WordCraftAxisChip', () => {
  it('renders nothing when axis is null', () => {
    const { container } = render(<WordCraftAxisChip axis={null} {...labels} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders horizontal label and arrow when axis is h', () => {
    render(<WordCraftAxisChip axis="h" {...labels} />);
    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('renders vertical label and arrow when axis is v', () => {
    render(<WordCraftAxisChip axis="v" {...labels} />);
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('fires onFlip when tapped', () => {
    const onFlip = vi.fn();
    render(<WordCraftAxisChip axis="h" onFlip={onFlip} {...labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'Flip word direction' }));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });
});
