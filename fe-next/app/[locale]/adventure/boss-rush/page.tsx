/**
 * Boss Rush Page
 *
 * Fight 5 bosses in sequence with escalating difficulty.
 * Requires defeating at least 1 boss in adventure mode to unlock.
 */

import { Metadata } from 'next';
import { BossRushPageClient } from './BossRushPageClient';

export const metadata: Metadata = {
  title: 'Boss Rush | LexiClash Adventure',
  description: 'Fight 5 bosses in a row. Health carries over. Full clear for bonus rewards.',
};

export default function BossRushPage() {
  return <BossRushPageClient />;
}
