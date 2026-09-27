'use client';

/** Curated character spread for the /avatar-test gallery, live idle motion on. */
import AvatarRenderer from '../AvatarRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getConfigRarity, RARITY_TOKENS, type VisualTier } from '@/lib/avatar/rarity';
import { SHOWCASE } from './showcase';

const ORDER: VisualTier[] = ['legendary', 'epic', 'rare', 'common'];

export default function ArtShowcase() {
  const { t } = useLanguage();
  return (
    <section data-testid="avatar-art-showcase" className="mb-10">
      <h2 className="font-neo-display text-neo-white text-lg font-bold mb-3">{t('avatarLab.showcase')}</h2>
      {ORDER.map(tier => (
        <div key={tier} className="mb-5" data-showcase-tier={tier}>
          <p className={`font-neo-display font-bold text-sm uppercase tracking-wider mb-2 ${RARITY_TOKENS[tier].text}`}>
            {t(RARITY_TOKENS[tier].labelKey)}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-4xl">
            {SHOWCASE[tier].map((config, i) => (
              <div key={`${tier}-${i}`} className="aspect-square min-w-0" data-rarity-check={getConfigRarity(config)}>
                <AvatarRenderer config={config} size={112} circular className="block w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
