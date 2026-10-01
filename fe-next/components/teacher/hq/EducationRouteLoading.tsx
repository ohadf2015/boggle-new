'use client';

import { PageLoader } from '@/components/ui/PageLoader';
import { QuickLaunchStage, useQuickLaunchIntent } from './QuickLaunchStage';

/** Education route boundary: the GO LIVE stage while a fresh launch is in flight, the ordinary loader otherwise. */
export function EducationRouteLoading() {
  const intent = useQuickLaunchIntent();
  if (intent) return <QuickLaunchStage />;
  return (
    <div className="flex-1 flex flex-col bg-neo-navy page-content-safe min-h-[100svh]">
      <PageLoader priority={false} />
    </div>
  );
}

export default EducationRouteLoading;
