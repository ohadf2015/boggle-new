import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const authState = { user: null as { id: string } | null, isAdmin: false, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('@/components/curator/CuratorAssignForm', () => ({
  CuratorAssignForm: () => <div data-testid="assign-form" />,
}));
vi.mock('@/components/curator/CuratorProposalsInbox', () => ({
  CuratorProposalsInbox: () => <div data-testid="inbox" />,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import CuratorAdminPageClient from '../PageClient';

beforeEach(() => {
  authState.user = null;
  authState.isAdmin = false;
  authState.loading = false;
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ curators: [] }) } as Response);
});

describe('CuratorAdminPageClient', () => {
  it('denies access to a non-admin', () => {
    render(<CuratorAdminPageClient />);
    expect(screen.queryByTestId('assign-form')).toBeNull();
    expect(screen.queryByTestId('inbox')).toBeNull();
  });

  it('renders the management surface for an admin', () => {
    authState.user = { id: 'a1' };
    authState.isAdmin = true;
    render(<CuratorAdminPageClient />);
    expect(screen.getByText('curator.admin.title')).toBeTruthy();
    expect(screen.getByTestId('assign-form')).toBeTruthy();
    expect(screen.getByTestId('inbox')).toBeTruthy();
  });
});
