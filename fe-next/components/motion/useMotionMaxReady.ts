'use client';

import { createContext, useContext } from 'react';

export const MotionMaxReadyContext = createContext(false);

// Drag and layout ship in a chunk loaded after hydration; a drag surface must read this so it re-renders once they land.
export const useMotionMaxReady = () => useContext(MotionMaxReadyContext);
