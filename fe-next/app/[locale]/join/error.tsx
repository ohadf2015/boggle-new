'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function JoinError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="join" area="join" />;
}
