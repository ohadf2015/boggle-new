// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import BrainTrainingPageClient from './PageClient';

export default function BrainTrainingPage() {
  return <BrainTrainingPageClient />;
}
