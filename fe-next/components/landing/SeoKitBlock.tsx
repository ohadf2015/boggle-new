import { CheckList, FaqList, Section } from '@/components/landing/kit';

export function SeoKitBlock({
  title,
  description,
  features = [],
  faq = [],
}: {
  title: string;
  description: string;
  features?: string[];
  faq?: { question: string; answer: string }[];
}) {
  return (
    <Section title={title} intro={<p>{description}</p>}>
      {features.length > 0 && <CheckList items={features} />}
      {faq.length > 0 && <FaqList items={faq.map((item) => ({ q: item.question, a: item.answer }))} />}
    </Section>
  );
}
