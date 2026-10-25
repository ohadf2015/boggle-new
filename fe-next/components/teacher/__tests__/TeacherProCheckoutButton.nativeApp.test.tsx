import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ pending: false, start: vi.fn() }) }));

import { TeacherProCheckoutButton } from '../TeacherProCheckoutButton';

describe('TeacherProCheckoutButton', () => {
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it('renders the purchase button on the web', () => {
    render(<TeacherProCheckoutButton source="dashboard_trial_expiring" testId="buy">Buy</TeacherProCheckoutButton>);
    expect(screen.getByTestId('buy')).toBeInTheDocument();
  });

  it('renders no purchase button inside the native app', async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    const { container } = render(<TeacherProCheckoutButton source="dashboard_trial_expiring" testId="buy">Buy</TeacherProCheckoutButton>);
    await Promise.resolve();
    expect(container.querySelector('[data-testid="buy"]')).toBeNull();
  });
});
