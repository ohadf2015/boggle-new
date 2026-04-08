'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

interface HapticsContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const HapticsContext = createContext<HapticsContextValue | null>(null);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled]);

  return (
    <HapticsContext.Provider value={value}>
      {children}
    </HapticsContext.Provider>
  );
}

export function useHapticsConfig() {
  const context = useContext(HapticsContext);
  if (!context) {
    throw new Error('useHapticsConfig must be used within HapticsProvider');
  }
  return context;
}
