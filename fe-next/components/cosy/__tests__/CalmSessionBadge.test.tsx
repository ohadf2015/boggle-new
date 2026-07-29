import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockCosy = false;
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => mockCosy,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => (k === 'cosy.noRush' ? 'Calm · no rush' : k) }),
}));

import { CalmSessionBadge } from '../CalmSessionBadge';

describe('CalmSessionBadge', () => {
  beforeEach(() => {
    mockCosy = false;
  });

  it('renders nothing when cosy mode is off', () => {
    const { container } = render(<CalmSessionBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the calm "no rush" cue when cosy mode is on', () => {
    mockCosy = true;
    render(<CalmSessionBadge />);
    expect(screen.getByText('Calm · no rush')).toBeInTheDocument();
  });

  it('is exposed to assistive tech as a status, not an interactive control', () => {
    mockCosy = true;
    render(<CalmSessionBadge />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Calm · no rush');
  });
});
