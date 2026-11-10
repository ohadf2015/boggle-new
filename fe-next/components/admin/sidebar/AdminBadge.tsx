import { cn } from '@/lib/utils';

/** Live count pill shared by the sidebar, the bottom bar and the More sheet. */
export function AdminBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn('rounded-full bg-neo-pink text-center font-bold text-neo-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
