/**
 * Which word-list pages ask to be indexed.
 *
 * 2026-10-30 AdSense "Low value content" audit (live, Googlebot UA, visible
 * server text): the word-list templates were 521 of the 1,206 URLs in
 * sitemap.xml (43%). Two list pages from the same grade share ~80% of their
 * visible words (same intro, steps, FAQ and rails around 10-20 list words),
 * and the 30 grade hubs (median 198 words) and 18 topic hubs (median 217) are
 * thinner still. That is the scaled, templated pattern AdSense and Google's
 * helpful-content systems read as low value, and none of these pages was in
 * the site's top-20 Search Console pages over 90 days.
 *
 * The pages stay live and linked — teachers use them — they just stop asking
 * to be indexed (noindex,follow) and leave the sitemap. The library hub and
 * the per-language hubs, which carry the editorial copy, stay indexed.
 * Flip a flag back to true to re-list a tier.
 */
export const WORD_LIST_INDEXING = {
  langHubs: true,
  gradeHubs: false,
  topicHubs: false,
  lists: false,
} as const;
