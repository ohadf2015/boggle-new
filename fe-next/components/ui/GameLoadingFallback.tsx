'use client';

import React from 'react';
import { PageLoader } from './PageLoader';

export function GameLoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-screen">
      <PageLoader size="md" />
    </div>
  );
}

export default GameLoadingFallback;
