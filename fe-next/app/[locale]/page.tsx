'use client';

import React from 'react';
import { LandingView } from '@/components/landing';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */
export default function HomePage(): React.JSX.Element {
  return <LandingView />;
}
