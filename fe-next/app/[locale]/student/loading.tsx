import { PageLoader } from '@/components/ui/PageLoader';

export default function StudentLoading() {
  return (
    <div data-testid="student-route-loading" aria-busy="true" className="flex h-dvh w-full flex-1 items-center justify-center">
      <PageLoader size="lg" priority={false} />
    </div>
  );
}
