import toast from 'react-hot-toast';
import posthog from '@/lib/analytics/lazyPosthog';
import { shareWithFallback, type ShareResult } from '@/utils/shareWithFallback';
import { trackShareCompleted } from '@/utils/share';

export interface RunBragShareOptions {
  text: string;
  url: string;
  surface: string;
  kind: string;
  copiedLabel: string;
}

/** Native share sheet with clipboard fallback. Call straight from a tap: Safari drops the gesture after an await. */
export async function runBragShare({ text, url, surface, kind, copiedLabel }: RunBragShareOptions): Promise<ShareResult> {
  const result = await shareWithFallback({ text, url, clipboardText: `${text}\n${url}` });
  posthog.capture('brag_share_tapped', { surface, kind, result });
  if (result === 'shared') trackShareCompleted('web_share_api', { surface, kind });
  if (result === 'copied') {
    trackShareCompleted('clipboard', { surface, kind });
    toast.success(copiedLabel, { duration: 2000 });
  }
  return result;
}
