import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeWeekLoop } from '../HomeWeekLoop';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const REPORTS = '/en/teacher/reports?classroomId=c1';

describe('<HomeWeekLoop>', () => {
  it('Given word results, Then the chip counts who is ready for the test and opens the class report', () => {
    render(<HomeWeekLoop ready={{ kind: 'counts', ready: 4, rated: 5 }} missed={[]} reportsHref={REPORTS} locked={false} onHomework={vi.fn()} t={t} />);
    const chip = screen.getByTestId('home-ready-chip');
    expect(chip).toHaveAttribute('href', REPORTS);
    expect(chip).toHaveTextContent('eduShell.home.loop.ready:{"ready":4,"total":5}');
  });

  it('Given a free plan, Then the counts stay visible and the chip only marks the deeper report as Pro', () => {
    render(<HomeWeekLoop ready={{ kind: 'counts', ready: 2, rated: 3 }} missed={[]} reportsHref={REPORTS} locked onHomework={vi.fn()} t={t} />);
    const chip = screen.getByTestId('home-ready-chip');
    expect(chip).toHaveTextContent('eduShell.home.loop.ready:{"ready":2,"total":3}');
    expect(screen.getByTestId('home-ready-lock')).toBeInTheDocument();
  });

  it('Given a game saved before word results existed, Then a plain line explains it, with no number and no link', () => {
    render(<HomeWeekLoop ready={{ kind: 'noResults' }} missed={[]} reportsHref={REPORTS} locked={false} onHomework={vi.fn()} t={t} />);
    const empty = screen.getByTestId('home-ready-empty');
    expect(empty).toHaveTextContent('eduShell.home.loop.readyEmpty');
    expect(empty.tagName).not.toBe('A');
    expect(empty.textContent).not.toMatch(/\d/);
    expect(screen.queryByTestId('home-ready-chip')).toBeNull();
  });

  it('Given students missed the last game, Then one tap opens homework for them', () => {
    const onHomework = vi.fn();
    render(<HomeWeekLoop ready={null} missed={['Maria', 'Sofia']} reportsHref={REPORTS} locked={false} onHomework={onHomework} t={t} />);
    const button = screen.getByTestId('home-homework');
    expect(button).toHaveTextContent('eduShell.home.loop.missed:{"count":2}');
    expect(button).toHaveAttribute('title', 'Maria, Sofia');
    fireEvent.click(button);
    expect(onHomework).toHaveBeenCalledTimes(1);
  });

  it('Given everyone played, Then there is no homework nudge', () => {
    render(<HomeWeekLoop ready={{ kind: 'counts', ready: 1, rated: 1 }} missed={[]} reportsHref={REPORTS} locked={false} onHomework={vi.fn()} t={t} />);
    expect(screen.queryByTestId('home-homework')).toBeNull();
  });

  it('Given nothing to say, Then it renders nothing', () => {
    const { container } = render(<HomeWeekLoop ready={null} missed={[]} reportsHref={REPORTS} locked={false} onHomework={vi.fn()} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
