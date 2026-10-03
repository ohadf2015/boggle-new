'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { trpc, trpcClient } from '@/lib/trpc';
import { hidesFloatingDevtools } from './floatingDevtoolsRoutes';

function RouteAwareDevtools() {
  const pathname = usePathname() ?? '';
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!hidesFloatingDevtools(pathname, window.location.search));
  }, [pathname]);
  return show ? <ReactQueryDevtools initialIsOpen={false} /> : null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <RouteAwareDevtools />}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
