/**
 * A student who just typed the code lands ON the stage: their own face in the
 * spotlight, Lexi waiting beside them, classmates popping in, and one clear
 * line about what happens next. No page scroll on a 390x844 phone.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId?: string }) => <div data-testid="classmate-face">{userId}</div> }));

import { ClassroomWaitingStage } from '../ClassroomWaitingStage';

const t = (key: string) => key;
const base = {
  username: 'Maya',
  avatar: <div data-testid="my-face" />,
  onEditAvatar: vi.fn(),
  nameSlot: <h2>Maya</h2>,
  classmates: [{ username: 'Leo' }, { username: 'Noa' }],
  onExit: vi.fn(),
  t,
};

describe('ClassroomWaitingStage', () => {
  it('puts the student on the arena stage with the waiting mascot', () => {
    render(<ClassroomWaitingStage {...base} />);
    expect(screen.getByTestId('waiting-stage-art').getAttribute('src')).toContain('arena-lobby-bg');
    const lexi = screen.getByTestId('classroom-lobby-mascot');
    expect(lexi).toHaveAttribute('alt', '');
    expect(lexi.getAttribute('src')).toContain('waiting-for-teacher');
    expect(screen.getByTestId('my-face')).toBeInTheDocument();
  });

  it('opens the avatar builder from the big face, which carries its own visible edge', () => {
    const onEditAvatar = vi.fn();
    render(<ClassroomWaitingStage {...base} onEditAvatar={onEditAvatar} />);
    const btn = screen.getByTestId('edit-avatar-button');
    expect(btn.className).toContain('border-[3px]');
    expect(btn.className).toContain('border-neo-lime');
    fireEvent.click(btn);
    expect(onEditAvatar).toHaveBeenCalled();
  });

  it('says it is waiting for the teacher in words, never a raw key', () => {
    render(<ClassroomWaitingStage {...base} />);
    const line = screen.getByTestId('waiting-for-teacher-line');
    expect(line.textContent).toMatch(/teacher/i);
    expect(line.textContent).not.toMatch(/academy\./);
  });

  it('counts the class and shows classmates, but not the student twice', () => {
    render(<ClassroomWaitingStage {...base} classmates={[{ username: 'Maya' }, { username: 'Leo' }, { username: 'Noa' }]} />);
    expect(screen.getByTestId('classroom-waiting-count')).toHaveTextContent('3');
    const faces = screen.getAllByTestId('classmate-face').map((el) => el.textContent);
    expect(faces).toEqual(['Leo', 'Noa']);
  });

  it('keeps a readable exit that asks before leaving', () => {
    const onExit = vi.fn();
    render(<ClassroomWaitingStage {...base} onExit={onExit} />);
    const exit = screen.getByLabelText('common.exit');
    expect(exit.className).toContain('text-neo-black');
    fireEvent.click(exit);
    expect(onExit).toHaveBeenCalled();
  });

  it('never pins a viewport-proportional floor or a page-level scroller', () => {
    const { container } = render(<ClassroomWaitingStage {...base} />);
    const classes = Array.from(container.querySelectorAll<HTMLElement>('*')).map((el) => (typeof el.className === 'string' ? el.className : ''));
    expect(classes.filter((c) => /min-h-\[\d+vh\]/.test(c))).toEqual([]);
    expect(classes.filter((c) => /(^|\s)overflow-y-(auto|scroll)/.test(c))).toEqual([]);
    expect(screen.getByTestId('classroom-waiting-stage').className).toContain('bg-neo-navy');
  });
});

describe('ClassroomWaitingStage — the wait is a game, not blank sky', () => {
  it('pulses a "Get ready!" call, motion only when the OS allows it', () => {
    render(<ClassroomWaitingStage {...base} />);
    const ready = screen.getByTestId('waiting-get-ready');
    expect(ready.textContent).toMatch(/get ready/i);
    expect(ready.className).toMatch(/motion-safe:animate-/);
    expect(ready.className).not.toContain('opacity-0');
  });

  it('offers a warm-up tap game built from the student’s own name', () => {
    render(<ClassroomWaitingStage {...base} />);
    const tiles = screen.getAllByTestId(/^warmup-tile-/);
    expect(tiles).toHaveLength(6);
    expect(tiles.slice(0, 4).map((el) => el.textContent).join('')).toBe('MAYA');
    expect(tiles.filter((el) => el.getAttribute('data-hot') === 'true')).toHaveLength(1);
  });

  it('scores a tap on the lit tile and moves the light', () => {
    render(<ClassroomWaitingStage {...base} />);
    const lit = screen.getAllByTestId(/^warmup-tile-/).find((el) => el.getAttribute('data-hot') === 'true')!;
    fireEvent.click(lit);
    expect(screen.getByTestId('warmup-score')).toHaveTextContent('1');
    expect(lit.getAttribute('data-hot')).toBe('false');
  });

  it('pops classmates in with a transform-only arrival (motion-safe)', () => {
    render(<ClassroomWaitingStage {...base} />);
    const face = screen.getAllByTestId('classmate-face')[0].closest('li')!;
    expect(face.className).toMatch(/motion-safe:animate-\[lc-mate-pop/);
  });

  it('keeps Lexi idling beside the student (motion-safe bob)', () => {
    render(<ClassroomWaitingStage {...base} />);
    expect(screen.getByTestId('classroom-lobby-mascot').className).toMatch(/motion-safe:animate-/);
  });
});
