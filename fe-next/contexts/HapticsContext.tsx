'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface HapticsContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const HapticsContext = createContext<HapticsContextValue | null>(null);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  const handleSetEnabled = useCallback((value: boolean) => {
    setEnabled(value);
  }, []);

  return (
    <HapticsContext.Provider value={{ enabled, setEnabled: handleSetEnabled }}>
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
