import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ComboMilestoneAnnouncement } from '../ComboMilestoneAnnouncement';

const motionPref = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div data-initial={JSON.stringify(initial)} data-animate={JSON.stringify(animate)} {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => motionPref.reduced,
}));

describe('ComboMilestoneAnnouncement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    motionPref.reduced = false;
  });

  const banner = () => screen.getByRole('status');

  it('given two milestones in a row, then they enter differently and tilt differently', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    const first = { entrance: banner().dataset.entrance, animate: banner().dataset.animate };
    random.mockReturnValue(0.2);
    rerender(<ComboMilestoneAnnouncement comboLevel={5} />);
    expect(banner().dataset.entrance).not.toBe(first.entrance);
    expect(['drop', 'slam', 'tilt']).toContain(banner().dataset.entrance);
    random.mockReturnValue(0.9);
    rerender(<ComboMilestoneAnnouncement comboLevel={7} />);
    expect(banner().dataset.animate).not.toBe(first.animate);
    expect(Math.abs(JSON.parse(banner().dataset.animate!).rotate)).toBeLessThanOrEqual(5);
  });

  it('given reduced motion, then the milestone still shows but only fades with no tilt', () => {
    motionPref.reduced = true;
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    expect(screen.getByText('NICE!')).toBeInTheDocument();
    expect(JSON.parse(banner().dataset.initial!)).toEqual({ opacity: 0 });
    expect(JSON.parse(banner().dataset.animate!)).toEqual({ opacity: 1 });
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

  it('hides 1200ms after the latest milestone even when combo changes again before it ends', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    act(() => { vi.advanceTimersByTime(600); });
    rerender(<ComboMilestoneAnnouncement comboLevel={4} />);
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByText('NICE!')).not.toBeInTheDocument();
  });

  it('restarts the hide timer on a new milestone', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={3} />);
    act(() => { vi.advanceTimersByTime(1000); });
    rerender(<ComboMilestoneAnnouncement comboLevel={5} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('FIRE!')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('FIRE!')).not.toBeInTheDocument();
  });

  it('uses solid colors (no gradients) and a polite live region', () => {
    const { rerender } = render(<ComboMilestoneAnnouncement comboLevel={0} />);
    rerender(<ComboMilestoneAnnouncement comboLevel={25} />);
    const milestone = screen.getByText('TRANSCENDENT!');
    expect(milestone.className).not.toContain('gradient');
    expect(milestone.className).toContain('shadow-hard');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
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
