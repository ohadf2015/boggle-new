// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassSetupInviteView, type InviteRoster } from '../ClassSetupInviteView';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('../ClassSetupInviteCode', () => ({ ClassSetupInviteCode: () => <div data-testid="invite-code" /> }));
vi.mock('@/components/teacher/hq/RosterSeats', () => ({ RosterSeats: () => null }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/components/education/motion', () => ({ CelebrationBurst: () => null }));

beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

const empty: InviteRoster = { students: [], arrivals: [], loading: false };
const withStudent: InviteRoster = { students: [{ name: 'Noa' } as never], arrivals: [], loading: false };
const onTogether = vi.fn();

function view(roster: InviteRoster, wordsAttention = false) {
  return (
    <ClassSetupInviteView
      classroom={{ name: 'Class', join_code: 'ABC234' }}
      roster={roster}
      joinUrl="https://x.test/join/ABC234"
      displayHost="x.test"
      homeHref="/home"
      reduced
      onShare={vi.fn()}
      onOpenProjector={vi.fn()}
      play={<button data-testid="play">play</button>}
      plan={<div data-testid="plan" />}
      rehearse={<button data-testid="rehearse">try</button>}
      tryAsStudent={<button data-testid="try-hero">try as a student</button>}
      words={<div data-testid="words" />}
      wordsAttention={wordsAttention}
      onTogetherChoice={onTogether}
      t={(k) => k}
    />
  );
}

describe('class-ready guide', () => {
  it('GIVEN no students WHEN it opens THEN one lime step leads, Try it as a student is offered at once, and no game or code shows', () => {
    render(view(empty));
    const ask = screen.getByTestId('setup-together');
    expect(within(ask).getByTestId('setup-together-now')).toBeInTheDocument();
    expect(within(ask).getByTestId('try-hero')).toBeInTheDocument();
    expect(within(ask).getByTestId('setup-together-later')).toBeInTheDocument();
    expect(screen.getByTestId('setup-together-now').compareDocumentPosition(screen.getByTestId('try-hero')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('setup-guide-rail')).toBeNull();
    expect(screen.queryByTestId('play')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-code')).not.toBeInTheDocument();
    expect(onTogether).not.toHaveBeenCalled();
  });

  it('GIVEN the teacher is with students WHEN nobody joined yet THEN the projector leads, no game is offered and there is one start-like button', () => {
    render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-now'));
    expect(onTogether).toHaveBeenCalledWith('now');
    expect(screen.getByTestId('invite-code')).toBeInTheDocument();
    expect(within(screen.getByTestId('setup-hero-slot')).getByTestId('setup-projector')).toBeInTheDocument();
    expect(screen.queryByTestId('play')).not.toBeInTheDocument();
    expect(screen.queryByTestId('setup-start-game')).toBeNull();
    expect(screen.getAllByTestId('setup-projector')).toHaveLength(1);
  });

  it('GIVEN the waiting step WHEN the first student joins THEN the game unlocks', () => {
    const { rerender } = render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-now'));
    rerender(view(withStudent));
    expect(within(screen.getByTestId('setup-hero-slot')).getByTestId('play')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-start-anyway')).not.toBeInTheDocument();
  });

  it('GIVEN the waiting step WHEN the teacher chooses not to wait THEN the game opens', () => {
    render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-now'));
    fireEvent.click(screen.getByTestId('setup-start-anyway'));
    expect(screen.getByTestId('play')).toBeInTheDocument();
  });

  it('GIVEN the teacher is alone WHEN they say so THEN the next-lesson plan leads at once, a private try stays one tap away, and no game shows', () => {
    render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-later'));
    expect(onTogether).toHaveBeenCalledWith('later');
    expect(within(screen.getByTestId('setup-plan-lead')).getByTestId('plan')).toBeInTheDocument();
    expect(screen.getByTestId('rehearse')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-guide-try')).toBeNull();
    expect(screen.queryByTestId('play')).not.toBeInTheDocument();
  });

  it('GIVEN the alone path WHEN the class turns out to be together THEN one tap returns to the class path', () => {
    render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-later'));
    fireEvent.click(screen.getByTestId('setup-together-back'));
    expect(screen.getByTestId('setup-projector')).toBeInTheDocument();
  });

  it('GIVEN the waiting step WHEN the teacher is not with the class after all THEN one quiet link opens the lesson plan', () => {
    render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-now'));
    fireEvent.click(screen.getByTestId('setup-together-alone-link'));
    expect(onTogether).toHaveBeenLastCalledWith('later');
    expect(screen.getByTestId('plan')).toBeInTheDocument();
  });

  it('GIVEN a student already joined WHEN it opens THEN it skips the question', () => {
    render(view(withStudent));
    expect(screen.queryByTestId('setup-together')).not.toBeInTheDocument();
    expect(screen.getByTestId('play')).toBeInTheDocument();
  });

  it('GIVEN the plan step WHEN a student arrives THEN the plan keeps its place and the game appears', () => {
    const { rerender } = render(view(empty));
    fireEvent.click(screen.getByTestId('setup-together-later'));
    const planNode = screen.getByTestId('plan');
    rerender(view(withStudent));
    expect(screen.getByTestId('plan')).toBe(planNode);
    expect(screen.getByTestId('play')).toBeInTheDocument();
  });

  it('GIVEN the game screen WHEN the word list is fine THEN it waits behind one quiet fold, and opens by itself when it needs attention', () => {
    const { rerender } = render(view(withStudent));
    const toggle = screen.getByTestId('setup-words-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('setup-words-body')).toHaveClass('hidden');
    fireEvent.click(toggle);
    expect(screen.getByTestId('setup-words-body')).not.toHaveClass('hidden');
    fireEvent.click(toggle);
    rerender(view(withStudent, true));
    expect(screen.getByTestId('setup-words-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('setup-words-toggle')).toBeDisabled();
    expect(screen.getByTestId('setup-words-body')).not.toHaveClass('hidden');
  });
});
