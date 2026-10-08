import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/admin/AdminPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('@/components/admin/EduDashboardPanel', () => ({
  EduDashboardPanel: () => <div data-testid="edu-panel" />,
}));

import { PageClient } from '../PageClient';

describe('admin education page', () => {
  it('mounts the education dashboard inside the admin shell', () => {
    render(<PageClient />);
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('edu-panel'));
  });
});
