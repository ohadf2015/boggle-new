// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useQueryClient } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({ usePathname: () => '/en' }));
vi.mock('@/lib/trpc', () => ({
  trpc: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  trpcClient: {},
}));

import { QueryProvider } from '../QueryProvider';

function GcTime() {
  return <>{String(useQueryClient().getDefaultOptions().queries?.gcTime)}</>;
}

describe('<QueryProvider> on the server', () => {
  it('never schedules query gc timers, which would pin each SSR request for minutes', () => {
    const html = renderToString(<QueryProvider><GcTime /></QueryProvider>);

    expect(html).toContain('Infinity');
  });
});
