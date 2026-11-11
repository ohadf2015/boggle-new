export type HomeAsk = 'account' | 'onboarding' | 'pro' | 'none';

/** Teacher Home shows ONE ask per screen; the first live one in this order wins. */
export function pickHomeAsk(live: Record<Exclude<HomeAsk, 'none'>, boolean>): HomeAsk {
  const order: Exclude<HomeAsk, 'none'>[] = ['account', 'onboarding', 'pro'];
  return order.find((ask) => live[ask]) ?? 'none';
}
