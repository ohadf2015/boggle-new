import type { ReactNode } from 'react';

interface BreadcrumbItem {
    name: string;
    url: string;
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[];
}

/**
 * Generates BreadcrumbList JSON-LD schema.
 * All content is from static route data — safe for dangerouslySetInnerHTML.
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps): ReactNode {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

export default BreadcrumbJsonLd;
