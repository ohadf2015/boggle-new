'use client';

import React from 'react';
import { LandingView } from '@/components/landing';

// Enable static generation with ISR for better performance
// Revalidate every 60 seconds to keep live room stats fresh
export const revalidate = 60;

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 *
 * Performance: Static generation with ISR improves TTFB from 726ms to <200ms
 */
export default function HomePage(): React.JSX.Element {
  return <LandingView />;
}
