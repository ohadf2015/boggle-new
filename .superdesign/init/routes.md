# Blast Mode Routes

## Route: `/:locale/blast`

### Route Chain

```
/:locale/blast
  -> app/[locale]/blast/page.tsx        (Server component, force-dynamic)
     -> app/[locale]/blast/PageClient.tsx (Client component, Suspense wrapper)
        -> components/blast/BlastView.tsx (Dynamic import, no SSR)
           -> Phase: 'playing'
              -> components/blast/BlastGame.tsx
           -> Phase: 'waveTransition'
              -> components/blast/BlastWaveTransition.tsx
           -> Phase: 'results'
              -> components/blast/BlastResults.tsx
```

### page.tsx (Server Entry)

```tsx
// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import BlastPageClient from './PageClient';

export default function BlastPage() {
  return <BlastPageClient />;
}
```

### PageClient.tsx (Client Wrapper)

Uses `next/dynamic` with `ssr: false` to avoid SSR for the game (requires browser APIs: ResizeObserver, anime.js, etc.). Shows a loading fallback with PlayfulBackground + PageLoader.

```tsx
'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10">
        <PageLoader size="lg" text="Loading Blast Mode..." />
      </div>
    </div>
  );
}

const BlastView = nextDynamic(() => import('@/components/blast/BlastView'), {
  loading: LoadingFallback,
  ssr: false,
});

export default function BlastPageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BlastView />
    </Suspense>
  );
}
```

### Phase Routing (managed by BlastView)

BlastView is the page orchestrator. It manages phase state (`BlastPhase`) to conditionally render:

| Phase | Component | Trigger |
|-------|-----------|---------|
| `playing` | `BlastGame` | Initial mount, wave advance, play again |
| `waveTransition` | `BlastWaveTransition` | Wave completed (board cleared + threshold met) |
| `results` | `BlastResults` | Game ended (dead end, give up, or failed threshold) |

Phase transitions:
- `playing` -> `waveTransition`: Board cleared, score threshold met
- `waveTransition` -> `playing`: After 2.5s auto-advance or tap
- `playing` -> `results`: Dead end, give up, or board cleared but threshold not met
- `results` -> `playing`: "Play Again" button (resets all state)

### Navigation

- **Quit** (during playing): Navigates to `/:locale/` via `router.push`
- **Back to Home** (from results): Navigates to `/:locale/` via `router.push`
- **Play Again** (from results): Resets all state, increments game key to force remount
