import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { BoardCreatorWizard } from '@/components/ugc/BoardCreatorWizard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'communityCreate', path: '/community/create', locale });
}

export default function CreateBoardPage() {
  return (
    <div className="min-h-screen bg-neo-navy p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <BoardCreatorWizard />
      </div>
    </div>
  );
}
