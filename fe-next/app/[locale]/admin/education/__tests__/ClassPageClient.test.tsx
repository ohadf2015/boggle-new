import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/admin/AdminPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('@/components/admin/education/AdminClassDetail', () => ({
  AdminClassDetail: ({ classId }: { classId: string }) => <div data-testid="class-detail">{classId}</div>,
}));

import { PageClient } from '../class/[classId]/PageClient';

describe('admin class page', () => {
  it('mounts the class detail for the route id inside the admin shell', () => {
    render(<PageClient classId="c1" />);
    expect(screen.getByTestId('shell')).toContainElement(screen.getByTestId('class-detail'));
    expect(screen.getByTestId('class-detail').textContent).toBe('c1');
  });
});
