/**
 * Endless Mode Page
 *
 * Procedurally generated floors with escalating difficulty.
 * Unlocked after completing all 10 worlds.
 */

import { Metadata } from 'next';
import EndlessPageClient from './PageClient';

export const metadata: Metadata = {
  title: 'Endless Mode | LexiClash Adventure',
  description: 'Procedurally generated floors with escalating difficulty. How far can you go?',
};

export default function EndlessPage() {
  return <EndlessPageClient />;
}
