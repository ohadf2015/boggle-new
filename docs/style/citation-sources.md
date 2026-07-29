# Pre-vetted citation sources

Use these and nothing else. If a topic needs a stat not on this list, run a PostHog query for an internal one, or cut the claim. Do not invent sources.

## Brain / cognition / word-game neuroscience

| Citation | What it says | Use for |
|---|---|---|
| AIMS Neuroscience (2021) systematic review on fMRI word processing | Word searching activates Broca's, Wernicke's, DLPFC, basal ganglia simultaneously | Any blog claiming "X parts of your brain light up" |
| Frontiers in Human Neuroscience (2019) meta-analysis on verbal vs spatial working memory | Verbal WM = left prefrontal; spatial WM = right | Phonological loop, working memory claims |
| Verghese et al., NEJM (2003), "Leisure activities and the risk of dementia in the elderly" | Crossword players had ~38% lower dementia risk over 21 years (n=469) | Crossword / aging / brain health |
| Brooker, Wesnes, Ballard et al., PROTECT study (2019, Exeter + King's College London) | 19,000+ adults 50+; regular word puzzlers scored cognitively as if ~10 years younger | Word puzzles & aging |
| Hagoort, P. — MUC (Memory, Unification, Control) model, Max Planck | Three-engine language processing framework | Strategy / how-the-brain-finds-words posts |
| FTC v. Lumos Labs (Lumosity), $50M settlement (2016) | Brain-training claims unsupported by evidence | Required caveat in any "brain training" blog |
| ACTIVE trial, JAMA (2014, 10-year follow-up) | Cognitive training transfers narrowly; reasoning gains held 10 years | Real "does brain training work" answer |
| Bialystok, Craik & Freedman (2007), Neuropsychologia | Bilinguals showed ~4-year delay in dementia symptom onset (n=184) | Bilingual / multilingual blogs |

## Vocabulary, reading, education

| Citation | What it says | Use for |
|---|---|---|
| Kuperman, Stadthagen-Gonzalez, Brysbaert (2012), Behavior Research Methods | Age-of-acquisition norms for 30,000 English words | Vocabulary growth, kids' education |
| National Reading Panel report (2000, NICHD) | Vocabulary is one of five core literacy pillars | Education-for-teachers posts |
| Cambridge English Vocabulary Profile | Maps words to CEFR levels A1–C2 | ESL / language-learning posts |
| Snowdon, "Aging with Grace" / Nun Study (1996, JAMA) | Higher linguistic density in early-life writing correlated with lower late-life Alzheimer's risk | Vocabulary + brain health |

## Game design, addiction, flow

| Citation | What it says | Use for |
|---|---|---|
| Csikszentmihalyi, "Flow: The Psychology of Optimal Experience" (1990) | Flow = skill matched to challenge; clear goals + immediate feedback | "Why word games are addictive" posts |
| Skinner, variable-ratio reinforcement (mid-20th century behavioral research) | Variable rewards drive higher engagement than fixed rewards | Same topic — be careful, dual-use research |
| BJ Fogg, Stanford Persuasive Tech Lab — Behavior Model (B=MAP) | Motivation × Ability × Prompt | Game design / habit posts |

## Industry numbers (use sparingly, only with date)

| Source | Number | When |
|---|---|---|
| The New York Times Company press release | Acquired Wordle from Josh Wardle for "low seven figures" (~$1M+) | 31 Jan 2022 |
| Newzoo Global Games Market Report | Cite specific year only; mobile market sizing | Annual |
| App Annie / data.ai mobile usage data | Cite specific year + report | Annual |
| Sensor Tower mobile-game revenue rankings | Cite specific year + report | Annual |

## LexiClash internal data (the unfair advantage)

These beat any generic stat. Query PostHog before writing the blog, then cite the data with the query date.

Approved internal-stat patterns:
- "LexiClash players average a [N]-letter word in a [seconds]-second round." (query: `word_played` event, average word_length, last 30 days)
- "Across our [N] daily-challenge attempts in [language], the median best word is [letters]." (PostHog)
- "Our Hebrew players find about [N]% more words per round than English players, possibly because Hebrew compresses meaning into shorter roots." (only if data supports it)
- "Out of the five LexiClash language modes — English, Hebrew, Swedish, Japanese, Spanish — the longest average word comes from [language]." (only if true)

When citing internal data: include the date the query was run, in italics. Example: "(LexiClash PostHog data, queried 19 May 2026)".

## Things you may state without a citation

- The dictionary fact that GRATE, STRANGE, JUMP, etc. are real English words
- Basic biology that fMRI measures blood-flow changes
- The structure of a Boggle board (4x4 grid of dice with letters)
- Well-known timelines: Boggle published by Parker Brothers in 1972; Scrabble by Alfred Butts 1933, sold to Selchow & Righter then Mattel/Hasbro; Words With Friends launched 2009 by Zynga; Wordle launched late 2021 by Josh Wardle; NYT acquired Wordle Jan 2022

## Topic the user might want where no good source exists

- "Word games make you live longer" — no clean study. Don't make the claim.
- "X% of players become smarter" — no clean causal study. Don't make the claim.
- "Word games improve memory" — correlational at best (PROTECT). Phrase accordingly.
- Specific app download numbers without a public press release. Don't make them up.
