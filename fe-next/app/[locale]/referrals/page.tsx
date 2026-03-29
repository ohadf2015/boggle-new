import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import ReferralDashboardClient from './PageClient';

export default function ReferralDashboardPage() {
  return <ReferralDashboardClient />;
}
