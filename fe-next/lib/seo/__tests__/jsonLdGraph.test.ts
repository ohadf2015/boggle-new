import { describe, it, expect } from 'vitest';
import { jsonLdGraph } from '../jsonLdGraph';

describe('jsonLdGraph', () => {
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] };
  const page = { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Play' };

  it('emits one object with a string @context instead of a top-level array', () => {
    const doc = JSON.parse(JSON.stringify(jsonLdGraph([breadcrumb, page])));
    expect(Array.isArray(doc)).toBe(false);
    expect(doc['@context'].toLowerCase()).toBe('https://schema.org');
  });

  it('keeps every node and its fields, dropping only the per-node @context', () => {
    const doc = jsonLdGraph([breadcrumb, page]);
    expect(doc['@graph']).toEqual([
      { '@type': 'BreadcrumbList', itemListElement: [] },
      { '@type': 'WebPage', name: 'Play' },
    ]);
  });

  it('does not mutate the input nodes', () => {
    jsonLdGraph([breadcrumb]);
    expect(breadcrumb['@context']).toBe('https://schema.org');
  });
});
