import type { ReactNode } from 'react';

interface JsonLdProps {
  data: unknown;
}

/**
 * Renders JSON-LD structured data inline in SSR HTML.
 * Use this instead of next/script for JSON-LD — Script defers to client-side,
 * which hides structured data from crawlers that only read initial HTML.
 * Content must be static (our own data, never user input).
 */
export function JsonLd({ data }: JsonLdProps): ReactNode {
  return (
    <script
      type="application/ld+json"
      // Static structured data only — never pass user input here
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default JsonLd;
