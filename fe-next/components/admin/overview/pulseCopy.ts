import type { Finding } from '@/lib/admin/findings';
import type { Translate } from '@/components/admin/shared/delta';

/** Plain-language sentence per Overview finding id. English fallbacks double as the copy. */
export function describePulseFinding(f: Finding, t: Translate, formatDate: (iso: string) => string): string {
  const p = f.params;
  const k = `admin.pulse.finding.${f.id}`;
  switch (f.id) {
    case 'games_up': return t(k, 'People are playing {pct}% more: {current} games this period.', p);
    case 'games_down': return t(k, 'Games fell {pct}%, from {prior} to {current}.', p);
    case 'players_up': return t(k, 'Daily players are up {pct}%, now {current} a day.', p);
    case 'players_down': return t(k, 'Daily players are down {pct}%, from {prior} to {current} a day.', p);
    case 'signups_up': return t(k, '{current} new signups, {pct}% more than the period before.', p);
    case 'signups_down': return t(k, 'Signups fell {pct}%, from {prior} to {current}.', p);
    case 'guest_heavy': return t(k, 'Only {pct}% of games are played by signed-in players. Sign-up prompts are not converting.', p);
    case 'activity_stopped': return t(k, 'No games for {days} days after a busy stretch. Check for an outage or broken tracking.', p);
    case 'momentum_drop': return t(k, 'Games fell {pct}% over the last 3 days against the rest of this period. The total will show it soon.', p);
    case 'sticky': return t(k, 'Players come back: {pct}% of monthly players show up on an average day.', p);
    case 'low_stickiness': return t(k, 'Only {pct}% of monthly players show up on an average day. People try it once and leave.', p);
    case 'service_down_redis': return t(k, 'Redis is down. Multiplayer and caching will misbehave.');
    case 'service_down_database': return t(k, 'The database is unreachable.');
    case 'memory_high': return t(k, 'The server is using {mb} MB of memory. Restarts are likely if it keeps growing.', p);
    case 'revenue_flowing': return t(k, '{orders} paid orders in the last 30 days, {paying} paying customers.', p);
    case 'checkouts_no_pay': return t(k, 'Checkouts started in the last 30 days: {count}. None paid. Check the checkout flow.', p);
    case 'payment_failing': return t(k, 'Subscriptions with a failed payment: {count}.', p);
    case 'reports_waiting': return t(k, 'Unread user reports to review: {count}.', p);
    case 'busiest_day': return t(k, '{date} was the busiest day: {games} games.', { ...p, date: formatDate(String(p.date)) });
    default: return f.id;
  }
}
