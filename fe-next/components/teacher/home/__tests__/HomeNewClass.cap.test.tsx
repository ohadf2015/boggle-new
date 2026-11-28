import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="plan-gate-upgrade">Upgrade</div> : null),
}));

import { HomeNewClass } from '../HomeClassList';

const t = (k: string) => k;

describe('<HomeNewClass> free-tier cap', () => {
  it('links to the new-class page while the teacher is under the free cap', () => {
    render(<HomeNewClass href="/en/teacher/classroom/new" count={2} limit={3} t={t} />);
    expect(screen.getByTestId('home-new-class')).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(screen.queryByTestId('plan-gate-upgrade')).not.toBeInTheDocument();
  });

  it('opens the Teacher Pro upgrade prompt instead of the new-class page when the free cap is reached', async () => {
    const user = userEvent.setup();
    render(<HomeNewClass href="/en/teacher/classroom/new" count={3} limit={3} t={t} />);
    const cta = screen.getByTestId('home-new-class');
    expect(cta).not.toHaveAttribute('href');
    await user.click(cta);
    expect(screen.getByTestId('plan-gate-upgrade')).toBeInTheDocument();
  });
});
