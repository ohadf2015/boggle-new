import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const onClick = vi.fn();
const hookArgs = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('@/components/teacher/pro/ProInsightLink', () => ({
  useProInsightOffer: (...args: unknown[]) => {
    hookArgs.calls.push(args);
    return onClick;
  },
}));

import { HomeClassInsightCard } from '../HomeClassInsightCard';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

beforeEach(() => {
  vi.clearAllMocks();
  hookArgs.calls = [];
});

describe('HomeClassInsightCard', () => {
  it('given a free teacher\'s class, when Home renders, then the one Pro entry links to that class\'s weekly insight', () => {
    render(<HomeClassInsightCard classroomId="c1" className="5B" language="he" t={t} />);
    const card = screen.getByTestId('home-class-insight');
    expect(card).toHaveTextContent('5B');
    const link = screen.getByTestId('home-class-insight-cta');
    expect(link).toHaveAttribute('href', '/he/teacher/classroom/c1/analytics');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalled();
    expect(hookArgs.calls[0].slice(1)).toEqual(['home_class_insight', 'he', true]);
  });

  it('given it wears the shared Pro banner shell, when rendered, then the Pro sticker is there', () => {
    render(<HomeClassInsightCard classroomId="c1" className="5B" language="en" t={t} />);
    expect(screen.getByTestId('home-class-insight-sticker')).toBeInTheDocument();
  });

  it('given the narrow Home rail, when rendered, then the button sits under the title and body in one column instead of beside them squeezing the title to a word per line', () => {
    render(<HomeClassInsightCard classroomId="c1" className="5B" language="en" t={t} />);
    const title = screen.getByRole('heading');
    expect(title.parentElement).toContainElement(screen.getByTestId('home-class-insight-cta'));
  });

  it('given a Latin class name on a Hebrew page, when the title is built, then the name is bidi-isolated so the question mark stays at the end', () => {
    render(<HomeClassInsightCard classroomId="c1" className="5B - English" language="he" t={t} />);
    expect(screen.getByRole('heading')).toHaveTextContent('\u20685B - English\u2069');
  });
});
