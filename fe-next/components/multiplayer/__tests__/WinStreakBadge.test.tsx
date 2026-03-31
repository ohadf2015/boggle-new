import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WinStreakBadge } from '../WinStreakBadge';

// Mock AdaptiveMotion to render plain divs
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    span: React.forwardRef(function MockMotionSpan({ children, ...props }: any, ref: any) {
      return <span ref={ref} {...props}>{children}</span>;
    }),
    div: React.forwardRef(function MockMotionDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
  },
}));

describe('WinStreakBadge', () => {
  it('renders nothing when streak is 0', () => {
    const { container } = render(<WinStreakBadge streak={0} t={(k: string) => k} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when streak is 1', () => {
    const { container } = render(<WinStreakBadge streak={1} t={(k: string) => k} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders fire emoji for streak 2-4', () => {
    render(<WinStreakBadge streak={3} t={(k: string, p?: any) => `${k} ${p?.count}`} />);
    expect(screen.getByText(/🔥/)).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it('renders lightning emoji for streak 5-9', () => {
    render(<WinStreakBadge streak={7} t={(k: string, p?: any) => `${k} ${p?.count}`} />);
    expect(screen.getByText(/⚡/)).toBeTruthy();
  });

  it('renders diamond emoji for streak 10+', () => {
    render(<WinStreakBadge streak={12} t={(k: string, p?: any) => `${k} ${p?.count}`} />);
    expect(screen.getByText(/💎/)).toBeTruthy();
  });

  it('has accessible label', () => {
    render(<WinStreakBadge streak={5} t={(k: string, p?: any) => `Win Streak: ${p?.count}`} />);
    expect(screen.getByLabelText(/Win Streak: 5/)).toBeTruthy();
  });
});
