'use client';

import { BoardCreatorWizard } from '@/components/ugc/BoardCreatorWizard';

export default function CreateBoardPage() {
  return (
    <div className="min-h-screen bg-neo-navy p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <BoardCreatorWizard />
      </div>
    </div>
  );
}
