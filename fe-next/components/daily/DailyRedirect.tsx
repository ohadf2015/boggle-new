'use client';

import DailyHub from './DailyHub';

/**
 * DailyRedirect - Shows the Daily Hub with both Word Hunt and Word Wheel.
 * The /daily route shows the hub. Share links with OG params still work via metadata.
 */
export default function DailyRedirect() {
  return <DailyHub />;
}
