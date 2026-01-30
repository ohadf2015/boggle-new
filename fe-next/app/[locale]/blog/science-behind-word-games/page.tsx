// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import SciencePageClient from './PageClient';

export const metadata = {
  title: 'The Science Behind Word Games and Brain Health | LexiClash Blog',
  description: 'Explore the fascinating cognitive benefits of word games. Learn how playing word games improves memory, vocabulary, mental agility, and overall brain health backed by scientific research.',
};

export default function SciencePage() {
  return <SciencePageClient />;
}
