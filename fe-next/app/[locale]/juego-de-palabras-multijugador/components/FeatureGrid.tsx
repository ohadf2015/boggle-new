import { CheckList, Section } from '@/components/landing/kit';
import { FEATURES } from '../data';

export function FeatureGrid() {
  return (
    <Section title="Jugar Scrabble Online Español Multijugador — ¿Por qué LexiClash?">
      <CheckList items={FEATURES} />
    </Section>
  );
}
