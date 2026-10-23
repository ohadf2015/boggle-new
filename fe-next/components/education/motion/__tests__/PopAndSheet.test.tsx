import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';
import { Pop } from '../Pop';
import { FeedbackSheet } from '../FeedbackSheet';

vi.unmock('framer-motion');

beforeEach(() => {
  motionPref.reduced = false;
});

describe('Pop', () => {
  it('starts at scale 0 and pops in', () => {
    render(<Pop>edu.star</Pop>);
    expect(screen.getByText('edu.star').style.transform).toMatch(/scale\(0\)/);
  });

  it('shows at full size with no tween under reduced motion', () => {
    motionPref.reduced = true;
    render(<Pop>edu.star</Pop>);
    expect(screen.getByText('edu.star').style.transform).not.toMatch(/scale\(0\)/);
  });
});

describe('FeedbackSheet', () => {
  it('rises from translateY(100%) and fires the sound hook in the same commit', () => {
    const onShow = vi.fn();
    render(<FeedbackSheet open variant="correct" title="edu.correct" onShow={onShow} />);
    const sheet = screen.getByRole('status');
    expect(sheet.style.transform).toMatch(/translateY\(100%\)/);
    expect(onShow).toHaveBeenCalledWith('correct');
  });

  it('uses neo lime for correct and neo red for incorrect', () => {
    const { rerender } = render(<FeedbackSheet open variant="correct" title="edu.correct" />);
    expect(screen.getByRole('status').className).toContain('bg-neo-lime');
    rerender(<FeedbackSheet open variant="incorrect" title="edu.incorrect" />);
    expect(screen.getByRole('status').className).toContain('bg-neo-red');
  });

  it('paints below its own bottom edge so the overshoot never shows a gap', () => {
    render(<FeedbackSheet open variant="correct" title="edu.t" />);
    expect(screen.getByRole('status').className).toMatch(/after:top-full.*after:bg-inherit|after:bg-inherit.*after:top-full/);
  });

  it('renders title, body and action, and nothing when closed', () => {
    const { rerender } = render(
      <FeedbackSheet open variant="incorrect" title="edu.t" action={<button>edu.gotIt</button>}>
        edu.body
      </FeedbackSheet>,
    );
    expect(screen.getByText('edu.t')).toBeTruthy();
    expect(screen.getByText('edu.body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'edu.gotIt' })).toBeTruthy();
    rerender(<FeedbackSheet open={false} variant="incorrect" title="edu.t" />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('appears in place with no slide under reduced motion, and still fires the sound hook', () => {
    motionPref.reduced = true;
    const onShow = vi.fn();
    render(<FeedbackSheet open variant="incorrect" title="edu.t" onShow={onShow} />);
    expect(screen.getByRole('status').style.transform).not.toMatch(/100%/);
    expect(onShow).toHaveBeenCalledWith('incorrect');
  });
});
