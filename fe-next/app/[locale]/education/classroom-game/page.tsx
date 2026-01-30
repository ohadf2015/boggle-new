import { Suspense } from 'react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import PageClient from './PageClient';

export const metadata = {
  title: 'Classroom Game | LexiClash Education',
  description: 'Play vocabulary games with your classroom',
};

export default function ClassroomGamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-screen">
          <NeoLoader variant="mascot-letters" size="lg" text="Loading game..." />
        </div>
      }
    >
      <PageClient />
    </Suspense>
  );
}
