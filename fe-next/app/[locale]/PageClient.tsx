'use client';

import React from 'react';
import { LandingView } from '@/components/landing';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

interface HomePageClientProps {
  initialData?: LandingInitialData;
}

/**
 * Main landing page client component - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  return <LandingView initialData={initialData} />;
}
