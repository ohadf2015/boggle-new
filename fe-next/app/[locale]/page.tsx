import React from 'react';
import { LandingView } from '@/components/landing';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 *
 * Note: This page uses dynamic rendering (force-dynamic from layout)
 * to ensure live room stats are always fresh
 */
export default function HomePage(): React.JSX.Element {
  return <LandingView />;
}
