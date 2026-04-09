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
}: GamePageSeoContentProps) {
  return (
    <section
      className={cn('sr-only', className)}
    >
      <h2>{title}</h2>
      <p>{description}</p>

      {features && features.length > 0 && (
        <ul>
          {features.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      )}

      {faq && faq.length > 0 && (
        <div>
          {faq.map((item, i) => (
            <div key={i}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
