type JsonLdNode = Record<string, unknown>;

export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': JsonLdNode[];
}

/**
 * Wraps several schema.org nodes in one `@graph` document. A top-level JSON-LD
 * array has no `@context`, and readers that call `doc['@context'].toLowerCase()`
 * throw on it in visitors' browsers.
 */
export function jsonLdGraph(nodes: readonly object[]): JsonLdGraph {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((node) => {
      const rest: JsonLdNode = { ...node };
      delete rest['@context'];
      return rest;
    }),
  };
}
