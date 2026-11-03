import { PageLoader } from '@/components/ui/PageLoader';

/** Dark-only on purpose: the student hub is a navy game surface, so the cream/dark pair would flash cream here. */
export default function StudentLoading() {
  return (
    <div data-testid="student-route-loading" aria-busy="true" className="flex h-dvh w-full flex-1 items-center justify-center bg-neo-navy">
      <PageLoader size="lg" priority={false} />
    </div>
  );
}
