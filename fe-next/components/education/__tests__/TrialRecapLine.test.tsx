import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import { TrialRecapLine } from '../TrialRecapLine';

describe('TrialRecapLine', () => {
  it('shows games and roster size when the class has a roster', () => {
    render(<TrialRecapLine recap={{ games: 4, students: 30 }} />);
    expect(screen.getByTestId('trial-recap')).toHaveTextContent('education.trial.recap:{"games":4,"students":30}');
  });

  it('never prints "0 students": guests join by code and are not on the roster, so the line says games only', () => {
    render(<TrialRecapLine recap={{ games: 4, students: 0 }} />);
    const text = screen.getByTestId('trial-recap').textContent ?? '';
    expect(text).toContain('education.trial.recapGamesOnly');
    expect(text).not.toContain('students');
  });

  it('renders nothing for a teacher who has run nothing', () => {
    const { container } = render(<TrialRecapLine recap={{ games: 0, students: 30 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
