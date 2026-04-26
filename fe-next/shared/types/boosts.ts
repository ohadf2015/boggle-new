export const BOOST_TYPES = ['freezeTime', 'hint', 'scoreMultiplier', 'firstWordBonus'] as const;
export type BoostType = (typeof BOOST_TYPES)[number];

export interface BoostConfig {
  i18nKey: string;
  /** Modes where this boost is selectable. */
  availableIn: ReadonlyArray<'mp' | 'sp' | 'drill' | 'classic'>;
}

export const BOOST_CONFIGS: Record<BoostType, BoostConfig> = {
  freezeTime: { i18nKey: 'boosts.freezeTime', availableIn: ['sp', 'classic'] },
  hint: { i18nKey: 'boosts.hint', availableIn: ['mp', 'sp', 'drill', 'classic'] },
  scoreMultiplier: { i18nKey: 'boosts.scoreMultiplier', availableIn: ['mp', 'sp', 'drill', 'classic'] },
  firstWordBonus: { i18nKey: 'boosts.firstWordBonus', availableIn: ['mp'] },
};

export function isBoostType(v: unknown): v is BoostType {
  return typeof v === 'string' && (BOOST_TYPES as readonly string[]).includes(v);
}

export interface ClaimBoostResult {
  success: boolean;
  remaining?: number;
  token?: string;
  error?: 'cap_reached' | 'already_claimed' | 'invalid_type' | 'invalid_session' | 'profile_not_found' | 'no_supabase' | 'rpc_failed' | 'network';
}
