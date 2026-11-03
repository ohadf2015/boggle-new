'use client';

import { EduRouteError } from '@/components/education/shell/EduRouteError';

export default function EduLiveError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <EduRouteError {...props} boundary="edu-live" area="live" />;
}
