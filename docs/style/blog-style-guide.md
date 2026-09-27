# Blog & Landing Style Guide

Use this for every blog and SEO landing in this repo. Goal: engaging, fun, real-data-driven copy that holds a reader. Not AI slop. The user explicitly asked for: real data, interesting facts, fun to read, keep the keywords, be to the point.

## Voice

- First person when there is a real moment to tell. "I spent three hours staring at a 4x4 grid" beats "Players often spend considerable time."
- Have opinions. Don't neutrally report two sides — pick one and back it.
- Acknowledge mixed feelings or uncertainty. "I don't know how to feel about this" beats false confidence.
- Vary rhythm. Short. Punchy. Then a longer sentence that takes its time getting where it's going.
- One-line zingers earn their keep — but only when they land.

## Length targets

| Type | Old | New |
|---|---|---|
| Long blog (8K–11K words) | 8K–11K | 1,500–2,500 |
| Mid blog (5K–7K) | 5K–7K | 1,200–2,200 |
| Short blog (<3K) | unchanged | 800–1,500 |
| Landing page | usually 1K–4K | unchanged structure, tightened prose |

Trim by: merging redundant sections, killing throat-clearing paragraphs, cutting summary closes. Never cut a real citation or a concrete stat to hit a word count.

**Match the exemplar's density, not the upper end of the range.** The science-behind pilot trimmed 10,647 → ~1,800 words and reads denser, not thinner. Subagents that hug the upper bound are overshooting.

## Hook (first 80 words)

- A concrete scene, specific number, or surprising claim.
- Never "In today's world…", "Whether you're a beginner or expert…", "Word games have been around for centuries…".
- One real personal detail lands harder than a thesis statement.

## Structure

- 4–7 sections per blog. Not 10.
- One point per section: claim → evidence → takeaway.
- H2 headings: sentence case. Not Title Case.
- No "Conclusion" / "Final Thoughts" header — end on a real line.
- No "Challenges and Future Prospects" formula. Ever.

## Citations — non-negotiable

- Every numeric claim needs a real source: journal + year, or organization + year, or LexiClash internal data.
- If you don't have a source, cut the claim.
- Pre-vetted sources live in `docs/style/citation-sources.md`. Use those, not invented studies.
- Internal LexiClash data is gold. "Our players average a 5-letter word per round" beats any generic stat.
- Never invent ratings, download counts, or user testimonials. Memory rule `feedback-no-fake-ratings` is absolute.

### Citation hygiene policy (mandatory)

The original blogs may contain citations that look real but cannot be verified. Drop any citation you can't trace to a journal + year + sample size. Examples seen in the wild that you must drop unless you can confirm the paper exists:

- "INHANCE Trial, McGill University (2025), 2.3% acetylcholine increase" — could not verify. **Drop.**
- "Stanford study found 87% of players…" with no DOI or year. **Drop.**
- "Recent research suggests…" with no named study. **Drop.**

If the original blog cited it and you can replace it from `citation-sources.md` on the same topic, do so. If you can't, cut the claim and write around it. A blog with five real citations beats a blog with eight where two are made up.

The `page.tsx` for each post has a `citations={[...]}` array passed to `BlogPostingJsonLd`. After rewriting, update that array to reflect the actual citations in your new content. Drop Google Scholar search-URL "citations" — they are not citations, they are searches.

### Post-rewrite housekeeping (per blog)

After rewriting a blog's `content.ts`:

1. Update `DATE_MODIFIED` in `page.tsx` to today's date (ISO format `YYYY-MM-DD`).
2. Sync the `citations={[...]}` array in `page.tsx` to match the real sources in the new blog.
3. If you changed the title or subtitle materially, update `metaTitles[locale]` and `metaDescriptions[locale]` in `page.tsx` to match. Keep meta descriptions under 160 characters.
4. Re-grep banned phrases against the spliced file (not the draft) to confirm nothing slipped in.

## Keywords

- Every original SEO keyword from title/H2/meta survives the rewrite. Grep before and after.
- Density should feel natural, not stuffed.
- The slug-anchored term appears in the title and the first 100 words.

## Banned phrases (auto-reject)

```
delve, dive into, deep dive, in today's [X] landscape, in the heart of,
stands as a testament, pivotal moment, vital role, crucial role, key role,
evolving landscape, fostering, underscoring, highlighting the importance of,
it's not just X — it's Y, in conclusion, the future looks bright,
exciting times lie ahead, must-visit, breathtaking, nestled, robust,
leverage, harness the power of, paradigm shift, game-changer, game-changing,
in order to, at this point in time, in the event that, due to the fact that,
serves as a, stands as a, marks a turning point, represents a shift,
unlock the power, tapestry, intricate, intricacies, vibrant (figurative),
showcase, exemplify, commitment to excellence, journey toward,
Despite [X] [Y] continues to thrive
```

## Style budgets

| Thing | Budget |
|---|---|
| Em dashes | ≤ 2 per 1,000 words. Comma or period instead. |
| Bold | ≤ 3 phrases per 1,000 words. Reserve for key terms. |
| Rule-of-three lists | ≤ 1 per piece. Triplets read as AI. |
| Title-case headings | 0. Sentence case only. |
| Inline-header bullets (`**Speed:** …`) | 0. Write prose. |
| Curly quotes | 0. Straight quotes only. |
| Emoji in headings | 0. |

## Numbers

- Concrete beats vague. "19,000 participants" > "many".
- Round numbers raise suspicion. 47% reads truer than 50%. "In 2019" reads truer than "in recent years".
- Pair a percent with a sample size when you have one.

## Endings

- Stop when the point is made.
- No summary paragraph that recaps the post.
- A small joke or self-aware line is fine. "Exciting times remain to be seen" is not.

## Locales

- HE / SV / JA / ES are native rewrites, not literal translations.
- Each locale may swap an anecdote if a local one lands better.
- Every locale rewrite commit must say "needs native review".

## 4-check before accepting any rewrite

1. **Keywords** — every term from the original title + section H2s present?
2. **Citations** — every number traceable to a source URL in `citation-sources.md` or LexiClash internal?
3. **Length** — within target range above?
4. **Banned phrases** — grep banned list. Zero hits?

If any check fails, send the rewrite back. "Close enough" is rejected.

## Exemplar

After the pilot rewrite is committed, the canonical exemplar is:
`fe-next/app/[locale]/blog/science-behind-word-games/content.ts` (EN locale, post-pilot).

Match its voice, density, citation pattern, and section pacing. Read it before starting any other blog rewrite.

## What to keep from existing posts

- The author persona "Ohad Fisher" + bio voice
- All real citations already in place (these are gold)
- The `sections` JSON shape — only the string contents change
- The sources/references section at the bottom
