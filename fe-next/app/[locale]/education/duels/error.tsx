'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function DuelsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="duels" area="student" autoReload={false} />;
}
