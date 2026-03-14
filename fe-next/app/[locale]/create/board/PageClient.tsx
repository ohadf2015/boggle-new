'use client';

import dynamic from 'next/dynamic';

const BoardCreatorWizard = dynamic(
  () => import('../../../../components/ugc/BoardCreatorWizard').then(mod => mod.BoardCreatorWizard),
  { ssr: false }
);

export default function BoardCreatorPageClient() {
  return (
    <main className="min-h-screen bg-neo-navy p-4 pt-20 pb-24">
      <div className="max-w-2xl mx-auto">
        <BoardCreatorWizard />
      </div>
    </main>
  );
}
