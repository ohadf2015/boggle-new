export default function EduLiveLoading() {
  return (
    <div data-testid="edu-live-loading" aria-busy="true" className="flex min-h-0 flex-1 items-center justify-center bg-neo-navy px-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-6 shadow-hard-lg">
        <span className="mx-auto size-24 animate-pulse rounded-full bg-neo-navy motion-reduce:animate-none" />
        <span className="h-6 w-full animate-pulse rounded-neo bg-neo-navy motion-reduce:animate-none" />
        <span className="mx-auto h-4 w-2/3 animate-pulse rounded-full bg-neo-navy motion-reduce:animate-none" />
      </div>
    </div>
  );
}
