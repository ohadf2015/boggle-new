/**
 * Builds a copy-paste iframe snippet for embedding the Word of the Day widget
 * on third-party websites for backlinks.
 */

export function buildEmbedSnippet(locale: string, origin = 'https://www.lexiclash.live'): string {
  const src = `${origin}/${locale}/embed/word-of-the-day`;

  const iframeSnippet = `<iframe
  src="${src}"
  width="100%"
  height="320"
  style="border:0; max-width: 360px;"
  loading="lazy"
  title="LexiClash - Word of the Day"
></iframe>`;

  return iframeSnippet;
}
