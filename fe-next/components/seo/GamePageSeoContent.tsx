import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface GamePageSeoContentProps {
  title: string;
  description: string;
  features?: string[];
  faq?: FaqItem[];
  className?: string;
  /** Render title as h1 when the host page has no visible h1. Default false → h2. */
  asH1?: boolean;
}

/**
 * SEO content for game pages — visually hidden but indexable by crawlers.
 * Keeps structured content (title, description, features, FAQ) available
 * for search engines without cluttering the game UI.
 */
export function GamePageSeoContent({
  title,
  description,
  features,
  faq,
  className,
  asH1 = false,
}: GamePageSeoContentProps) {
  const Title = asH1 ? 'h1' : 'h2';
  return (
    <section
      className={cn('sr-only', className)}
    >
      <Title>{title}</Title>
      <p>{description}</p>

      {features && features.length > 0 && (
        <ul>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      )}

      {faq && faq.length > 0 && (
        <div>
          {faq.map((item) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
