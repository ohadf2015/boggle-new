import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeInsightCard } from '../HomeInsightCard';

const t = (k: string, p?: Record<string, string | number>) => `${k}${p?.name ? `:${p.name}` : ''}`;
const insights = [
  { id: 'streak', value: 3 },
  { id: 'busiest', value: 'Tuesday' },
] as const;

describe('<HomeInsightCard>', () => {
  beforeEach(() => localStorage.clear());

  it('Given no insights, Then nothing renders', () => {
    const { container } = render(<HomeInsightCard insights={[]} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given each open, Then the next insight is shown', () => {
    const first = render(<HomeInsightCard insights={insights} t={t} />);
    const a = screen.getByText(/eduShell\.insight\.(streak|busiest)$/).textContent;
    first.unmount();
    render(<HomeInsightCard insights={insights} t={t} />);
    expect(screen.getByText(/eduShell\.insight\.(streak|busiest)$/).textContent).not.toBe(a);
  });

  it('Given the next button, Then it cycles to the other insight', () => {
    render(<HomeInsightCard insights={insights} t={t} />);
    const before = screen.getByText(/eduShell\.insight\.(streak|busiest)$/).textContent;
    fireEvent.click(screen.getByRole('button', { name: 'eduShell.insight.next' }));
    expect(screen.getByText(/eduShell\.insight\.(streak|busiest)$/).textContent).not.toBe(before);
  });

  it('Given a single insight, Then there is nothing to cycle to', () => {
    render(<HomeInsightCard insights={[insights[0]]} t={t} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
