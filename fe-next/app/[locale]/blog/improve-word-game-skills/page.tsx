// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ImproveSkillsPageClient from './PageClient';

export const metadata = {
  title: 'How to Improve Your Word Game Skills | LexiClash Blog',
  description: 'Discover proven strategies and techniques to level up your word game performance. Learn pattern recognition, vocabulary building, and competitive tactics from experienced players.',
};

export default function ImproveSkillsPage() {
  return <ImproveSkillsPageClient />;
}
