import { Section, Steps } from '@/components/landing/kit';
import { STEPS } from '../data';

export function StepsSection() {
  return (
    <Section title="Empieza en 30 segundos">
      <Steps items={STEPS.map((s) => ({ title: s.title, body: s.body }))} />
    </Section>
  );
}
