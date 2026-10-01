import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const nav = { pathname: '/en/teacher' };
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => <div data-testid="rq-devtools" />,
}));
vi.mock('@/lib/trpc', () => ({
  trpc: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  trpcClient: {},
}));

import { QueryProvider } from '../QueryProvider';

describe('<QueryProvider> — dev devtools bubble', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  it('Given a teacher route in dev, Then the floating devtools bubble is not mounted over HQ actions', () => {
    vi.stubEnv('NODE_ENV', 'development');
    nav.pathname = '/en/teacher';
    render(<QueryProvider><p>hq</p></QueryProvider>);
    expect(screen.getByText('hq')).toBeInTheDocument();
    expect(screen.queryByTestId('rq-devtools')).toBeNull();
  });

  it('Given a classroom multiplayer lobby in dev, Then the bubble stays off START GAME', () => {
    vi.stubEnv('NODE_ENV', 'development');
    nav.pathname = '/en/multiplayer';
    window.history.replaceState(null, '', '/en/multiplayer?room=AB12CD&classroom=true&host=true');
    render(<QueryProvider><p>lobby</p></QueryProvider>);
    expect(screen.queryByTestId('rq-devtools')).toBeNull();
  });

  it('Given a non-education route in dev, Then the devtools are still available', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    nav.pathname = '/en/blast';
    window.history.replaceState(null, '', '/en/blast');
    render(<QueryProvider><p>game</p></QueryProvider>);
    expect(await screen.findByTestId('rq-devtools')).toBeInTheDocument();
  });
});
