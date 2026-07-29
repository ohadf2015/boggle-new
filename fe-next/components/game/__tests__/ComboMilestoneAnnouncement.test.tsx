import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ComboMilestoneAnnouncement } from '../ComboMilestoneAnnouncement';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('ComboMilestoneAnnouncement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing at combo level 0', () => {
    const { container } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    expect(container.textContent).toBe('');
  });

  it('renders nothing at non-milestone combo levels', () => {
    const { container } = render(<ComboMilestoneAnnouncement comboLevel={2} />);
    expect(container.textContent).toBe('');
  });

  it('shows "NICE!" when combo reaches 3', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    expect(screen.getByText('NICE!')).toBeInTheDocument();
  });

  it('shows "FIRE!" when combo reaches 5', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={5} />);
    expect(screen.getByText('FIRE!')).toBeInTheDocument();
  });

  it('shows "MYTHIC!" when combo reaches 7', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={7} />);
    expect(screen.getByText('MYTHIC!')).toBeInTheDocument();
  });

  it('shows "GODLIKE!" when combo reaches 10', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={10} />);
    expect(screen.getByText('GODLIKE!')).toBeInTheDocument();
  });

  it('hides milestone after 1200ms', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    expect(screen.getByText('NICE!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText('NICE!')).not.toBeInTheDocument();
  });

  it('applies neo-brutalist gradient styling', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={10} />);
    const milestone = screen.getByText('GODLIKE!');
    expect(milestone.className).toContain('rounded-neo');
    expect(milestone.className).toContain('border-3');
  });

  it('does not show milestone when combo decreases', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={5} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    expect(screen.queryByText('NICE!')).not.toBeInTheDocument();
  });

  it('shows "LEGENDARY!" when combo reaches 15', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={15} />);
    expect(screen.getByText('LEGENDARY!')).toBeInTheDocument();
  });

  it('shows "MYTHIC STREAK!" when combo reaches 20', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={20} />);
    expect(screen.getByText('MYTHIC STREAK!')).toBeInTheDocument();
  });

  it('shows "TRANSCENDENT!" when combo reaches 25', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={25} />);
    expect(screen.getByText('TRANSCENDENT!')).toBeInTheDocument();
  });
});
