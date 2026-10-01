import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import { HqAssignmentsPill } from '../HqAssignmentsPill';

describe('<HqAssignmentsPill> — assignments at a glance on the deck', () => {
  it('Given assignments, Then the count shows and a tap opens homework', () => {
    const onOpen = vi.fn();
    render(<HqAssignmentsPill count={3} onOpen={onOpen} />);
    const pill = screen.getByTestId('hq-assignments-pill');
    expect(pill).toHaveTextContent('3');
    expect(pill).toHaveAttribute('aria-label', 'eduHq.hq.assignedAria:{"count":3}');
    fireEvent.click(pill);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it.each([null, 0])('Given count=%s (unknown or none — the first-assignment nudge covers zero), Then nothing renders', (count) => {
    const { container } = render(<HqAssignmentsPill count={count} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
