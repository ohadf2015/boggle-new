import { FaqList, Section } from '@/components/landing/kit';
import { FAQS } from '../data';

export function FaqAccordion() {
  return (
    <Section title="Preguntas frecuentes">
      <FaqList items={FAQS} openFirst exclusive="faq-es" />
    </Section>
  );
}
