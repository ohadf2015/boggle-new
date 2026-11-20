import { peekOAuthProvider } from '@/lib/auth/oauthProviderLatch';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { callbackSessionLoss } from './noSessionReport';

/** Distinct from signup_failed so a lost callback is visible without feeding the silence funnel. */
export function reportCallbackNoSession(override?: string): void {
  if (typeof window === 'undefined') return;
  const loss = callbackSessionLoss({
    search: window.location.search,
    hash: window.location.hash,
    provider: peekOAuthProvider(),
    override,
  });
  if (!loss) return;
  trackGrowthEvent('auth_callback_no_session', {
    reason: loss.reason,
    provider: loss.provider,
  });
}
