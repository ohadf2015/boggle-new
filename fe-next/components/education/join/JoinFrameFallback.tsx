import { PageLoader } from '@/components/ui/PageLoader';

export function JoinFrameFallback() {
  return (
    <div data-testid="join-frame-fallback" className="flex h-dvh">
      <PageLoader priority={false} />
    </div>
  );
}

export default JoinFrameFallback;
