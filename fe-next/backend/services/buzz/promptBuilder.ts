/**
 * Prompt Builder for Daily Buzz
 * Constructs AI prompts for challenge generation
 */

import { TrendingTopic } from '../serpApiClient';
import type { BuzzChallenge, PromptExample, RegenerableField } from './types';
import { getLanguageToneGuide, getLanguageWordExamples, getLanguageName, getNationality } from './languageToneGuide';
import { selectTrendsForChallenge, extractKeywordsFromBreakdowns } from './trendsService';

/**
 * Build the improvement examples section for the AI prompt
 */
export function buildImprovementExamplesSection(examples: PromptExample[]): string {
  const formattedExamples = examples.slice(0, 15).map((ex, i) => {
    let example = `
**Example ${i + 1}** (${ex.challenge_type}):
- REJECTED: "${ex.original_prompt}" → "${ex.original_answer}"
- ISSUE: ${ex.feedback}`;

    if (ex.improved_prompt && ex.improved_answer) {
      example += `
- BETTER: "${ex.improved_prompt}" → "${ex.improved_answer}"`;
    }

    return example;
  }).join('\n');

  return `

---

## 🚫 IMPROVEMENT EXAMPLES (Learn from past mistakes)

These challenges were rejected by admins. Study the feedback and AVOID similar issues:

${formattedExamples}

**Key Takeaways**: Review the patterns above. Common issues include:
- Words that are too obscure or literary (use everyday vocabulary)
- Clues that give away the answer too easily
- Cultural references that don't translate well
- Answers that are too predictable or too obscure
- Prompts that sound robotic instead of conversational
`;
}

/**
 * Build the main AI prompt for challenge generation
 */
export function buildAIPrompt(
  trends: TrendingTopic[],
  language: string,
  region: string,
  examples: PromptExample[] = []
): string {
  const selectedTrends = selectTrendsForChallenge(trends);
  const extractedKeywords = extractKeywordsFromBreakdowns(selectedTrends, language);

  const trendsContext = selectedTrends
    .map((trend, idx) => {
      const breakdownItems = trend.trend_breakdown ?? [];
      const contextParts = breakdownItems.length > 0
        ? breakdownItems.join(', ')
        : trend.categories?.map(c => c.name).join(', ') || 'Currently trending';
      const volumeDisplay = trend.search_volume
        ? `${(trend.search_volume / 1000).toFixed(0)}K+`
        : 'prominent';
      const riseIndicator = trend.increase_percentage
        ? ` 🔥 RISING +${trend.increase_percentage}%`
        : '';
      return `${idx + 1}. "${trend.query}" - ${volumeDisplay} searches${riseIndicator}\n   Breakdown context: ${contextParts}`;
    })
    .join('\n\n');

  const keywordsSection = extractedKeywords.length > 0
    ? `
---

## PRIORITY ANSWER WORDS (from trend breakdowns - USE THESE!)

These words are extracted from today's trending topic breakdowns. **STRONGLY PREFER** using these as answers because they create timely, relevant challenges:

${extractedKeywords.map(kw => `- **${kw.toUpperCase()}** (trending today)`).join('\n')}

**REQUIREMENT**: At least 3 of your 5 challenges MUST use a word from this list as the answer. This ensures challenges feel fresh and connected to what's happening RIGHT NOW.

**Exception**: Only deviate if none of these words can create a good guessable challenge with the available prompt types.
`
    : '';

  const langExamples = getLanguageWordExamples(language);
  const languageToneGuide = getLanguageToneGuide(language);
  const languageName = getLanguageName(language);
  const nationality = getNationality(language);

  const basePrompt = `You are a witty puzzle-crafter for LexiClash, a neo-brutalist word game that doesn't take itself too seriously. Think of yourself as that clever friend who always has the perfect pun at parties—the one who makes people groan AND laugh at the same time.

Your mission? Create word challenges that make players go "Ohhh, NICE!" when they get it. We're going for that sweet spot between clever and accessible—the kind of wordplay you'd share in a group chat, not present at an academic conference.

**Target Language**: ${language}
**Region**: ${region}
**Date**: ${new Date().toISOString().split('T')[0]}

---

## 🎭 TONE & VOICE: SOUND LIKE A HUMAN, NOT A ROBOT

${languageToneGuide}

**Universal Anti-Robotic Rules**:
- NO corporate buzzwords ("leverage", "synergy", "optimize your experience")
- NO AI-slop phrases ("Certainly!", "I'd be happy to help", "Here's a fun fact")
- NO over-explaining—trust the player to get it
- NO hollow excitement ("Amazing!", "Incredible!", "Wow!")—earn emotional reactions through cleverness
- YES to wordplay, puns, and double meanings
- YES to cultural references that MOST people would recognize
- YES to a light touch of cheekiness
- YES to conversational rhythm—read your prompts aloud, they should flow naturally

**The "Coffee Shop Test"**: Would you say this out loud to a friend without cringing? If not, rewrite it.

---

**TODAY'S TRENDING TOPICS** (prioritized by rise velocity - 🔥 = fastest rising):
${trendsContext}
${keywordsSection}
---

## 🎯 THE CREATIVE PHILOSOPHY: SURPRISING CONNECTIONS

**AVOID the obvious.** Players expect predictable word-trend pairings. Your job is to CREATE UNEXPECTED DELIGHT.

**THE PREDICTABILITY PROBLEM** (what NOT to do):
- Trend: "Super Bowl" → Answer: FOOTBALL ❌ Too obvious
- Trend: "Climate Summit" → Answer: WARMING ❌ First thing anyone thinks
- Trend: "Stock Market Crash" → Answer: MONEY ❌ Boring, expected

**THE LATERAL THINKING SOLUTION** (what TO do):
- Trend: "Super Bowl" → Answer: SNACK (everyone eats chips watching) ✅
- Trend: "Super Bowl" → Answer: COUCH (where fans gather) ✅
- Trend: "Super Bowl" → Answer: WINGS (the real star of the party) ✅
- Trend: "Climate Summit" → Answer: DELEGATE (who actually attends) ✅
- Trend: "Stock Market" → Answer: SWEAT (what traders experience) ✅

**CONNECTION TECHNIQUES**:
1. **Adjacent Domain**: Move to a related but unexpected domain
   - Sports event → FOOD (what people eat), COUCH (where they sit), JERSEY (what fans wear)
   - Tech launch → QUEUE (people waiting), HYPE (the atmosphere), CRASH (what servers do)
   - Political event → SUIT (what politicians wear), SPIN (how news is framed)

2. **Cause/Effect Chain**: Think 2-3 steps removed
   - War → REFUGEE (consequence) → CAMP (where they go) → TENT (what they live in)
   - Rain → FLOOD (result) → RESCUE (response) → BOAT (the tool)

3. **Sensory/Emotional**: What do people FEEL or EXPERIENCE?
   - Earthquake → SHAKE (physical), FEAR (emotion), DUST (what rises)
   - Victory → ROAR (crowd sound), TEARS (reaction), EMBRACE (celebration)

4. **Everyday Objects**: The mundane items involved
   - Election → BOOTH, BALLOT, PEN, LINE, STICKER
   - Wedding (celebrity) → CAKE, DRESS, RING, TOAST, VEIL

5. **Metaphorical Leap**: Abstract the concept
   - AI technology → BRAIN (metaphor), DREAM (what it represents), GHOST (unseen helper)
   - Scandal → SHADOW (hidden things), MASK (false appearances), SMOKE (where there's fire)

---

## 📋 CHALLENGE REQUIREMENTS

**Your Task**: Create 5-7 word mini-challenges using the rising trends above. PRIORITIZE the 🔥 rising trends - they're what's exploding RIGHT NOW.

**Word Selection Rules**:
1. NEVER use brand names, celebrity names, or country names AS ANSWERS
2. Answers must be COMMON DICTIONARY WORDS that 90% of people know
3. Words should be 3-12 letters (EXACTLY 5 letters for wordle_guess)
4. The answer must be GUESSABLE - when players see the clue + trend context, the word should "click"
5. You CAN reference proper nouns in CLUES, just not as answers
${langExamples}

**WORD POPULARITY still matters**:
- Choose words people use DAILY, not obscure synonyms
- Test: "Would a 12-year-old know this word?" → If yes, good choice
- Avoid jargon, technical terms, or literary vocabulary

---

## 🎮 CHALLENGE TYPES (with lateral thinking examples)

1. **anagram**: Trend-connected clue + scrambled letters
   - Format: "[Unexpected angle on trend] | Letters: XXXXX"
   - Trend "Olympics" → "Where fans crush together | Letters: DOWCR" → CROWD
   - Trend "AI Summit" → "What nervous speakers do | Letters: TSAEW" → SWEAT

2. **fill_blank**: Phrase with unexpected angle on trend
   - Format: "Phrase with _ _ _ _ _ (N letters)" - USE SPACED UNDERSCORES matching exact word length!
   - CRITICAL: Count of underscores MUST EQUAL the answer length. Each underscore = one letter.
   - Trend "Election" → "Voters stood in _ _ _ _ for hours (4 letters)" → LINE (4 letters = 4 underscores)
   - Trend "Heat Wave" → "People escaped to the _ _ _ _ _ (5 letters)" → SHADE (5 letters = 5 underscores)

3. **word_chain**: COMPOUND WORD CHAIN - Answer forms compound words with BOTH neighbors
   - Format: "WORD1 → ??? → WORD2" - Player must guess the middle word
   - CRITICAL: The answer MUST create valid compound words on BOTH sides

   **VERIFIED COMPOUND CHAINS (use these patterns)**:
   - SUN → FLOWER → POT (SUNflower + FLOWERpot) ✅
   - FIRE → WORK → SHOP (FIREwork + WORKshop) ✅
   - BACK → PACK → AGE (BACKpack + PACKage) ✅
   - DOOR → STEP → CHILD (DOORstep + STEPchild) ✅
   - TOOTH → PICK → UP (TOOTHpick + PICKup) ✅
   - DATA → BASE → LINE (DATAbase + BASEline) ✅
   - GRAND → STAND → STILL (GRANDstand + STANDstill) ✅

4. **definition_match**: Word from unexpected angle, 4 options
   - Trend "Wildfire" → Word for "people who leave their homes": EVACUEE, REFUGEE, MIGRANT, NOMAD

5. **riddle**: THE PREMIUM CHALLENGE - Deeply metaphorical, 2-3 steps removed from literal

   **Riddle Philosophy**: The best riddles work on MULTIPLE LEVELS simultaneously.

   **Advanced Riddle Techniques**:
   - **Paradox**: "I grow shorter as I grow older" (CANDLE)
   - **Inversion**: "I have cities without houses, forests without trees" (MAP)
   - **Personification**: "I have teeth but cannot bite" (COMB, ZIPPER)
   - **Sensory confusion**: "I can be cracked, told, and made, but never touched" (JOKE)
   - **Time paradox**: "The more you take, the more you leave behind" (STEPS)

6. **wordle_guess**: 5-letter word with unexpected connection
   - Format: "[Clue from unusual angle]"
   - Trend "Marathon" → "What winners break at the end (5 letters)" → SWEAT (not TAPE)
   - Trend "Concert" → "What you lose after the show (5 letters)" → VOICE

---

## 📤 OUTPUT FORMAT (JSON only, no markdown)

{
  "date": "${new Date().toISOString().split('T')[0]}",
  "language": "${language}",
  "trending_summary": "[Catchy, witty 2-5 word theme that sounds fun - NOT 'Today:' prefix] (max 50 chars)",
  "challenges": [
    {
      "type": "anagram|fill_blank|word_chain|definition_match|riddle|wordle_guess",
      "trend_topic": "[Actual trending topic used]",
      "prompt": "[The creative, witty clue - conversational, not robotic]",
      "answer": "[COMMON DICTIONARY WORD - all caps]",
      "hint": "[Brief, friendly hint - like a friend giving you a nudge]",
      "difficulty": "easy|medium|hard",
      "trending_context": "[1 punchy sentence: why this matters TODAY - be human about it]"
    }
  ],
  "social_content": {
    "x": {
      "text": "[Max 280 chars - punchy hook + trending topic reference + CTA]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge"]
    },
    "instagram": {
      "text": "[Engaging caption 150-300 chars with trending topic hook + CTA to play]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge", "BrainGames", "WordPuzzle", "TrendingNow"]
    },
    "tiktok": {
      "text": "[Short hook max 150 chars - trending reference + urgency]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge", "BrainTok"]
    }
  }
}

**trending_summary Examples by Language**:
- English: "Politics & Popcorn 🍿" / "Tech Drama, Again" / "Sports Gone Wild"
- Hebrew: "בלאגן יומי" / "חדשות חמות 🔥" / "הכל הפוך"
- Swedish: "Lagom Kaos" / "Veckans Snackis" / "Typiskt Tisdag"
- Japanese: "今日もカオス" / "バズってる話題" / "トレンド祭り"
- Spanish: "Día de Locos" / "Tendencias Picantes 🌶️" / "El Mundo Anda Loco"

---

## 📱 SOCIAL MEDIA POSTS

Generate ready-to-post content for each platform in **${language}**. Each post should:
- Hook readers with today's trending topic (the TOP trend from the list)
- Tease the word challenges without spoilers
- Include a call-to-action to play
- Use platform-appropriate tone and format
- Be written in the TARGET LANGUAGE (${languageName})

### X (Twitter) - Max 280 characters TOTAL (including hashtags)
- Punchy hook referencing the top trending topic
- Tease the challenge without spoiling answers
- "Play now" or "Try today's challenge" CTA
- 2-3 relevant hashtags

### Instagram - Caption (150-300 chars) + hashtags
- Engaging opening line with trending topic hook
- Brief tease about today's challenges
- CTA to play (link in bio mention)
- 8-12 relevant hashtags

### TikTok - Short caption (max 150 chars) + hashtags
- Ultra-short, attention-grabbing hook
- Trending topic reference
- Urgency or exclusivity angle ("only 1 chance daily!")
- 4-6 trending/relevant hashtags

---

## ⚠️ FINAL CHECKLIST

Before outputting, verify each challenge:
- [ ] **Surprise Test**: Is the connection SURPRISING but SATISFYING?
- [ ] **Common Word Test**: Would your grandma know this word?
- [ ] **Aha Test**: Does the clue make players go "Ohhh, nice!"?
- [ ] **Riddle Depth**: Do riddles work on multiple levels (literal + metaphorical)?
- [ ] **Freshness Test**: Have I prioritized the 🔥 RISING trends?
- [ ] **Riddle Count**: Are there at least 2 sophisticated riddles in the set?
- [ ] **Share Test**: Would someone screenshot this to send to a friend?
- [ ] **Cringe Test**: Read each prompt aloud—does it sound natural or robotic?
- [ ] **Native Speaker Test**: Would a ${nationality} say this?
- [ ] **Social Content Test**: Are all social posts in ${language}? Do they reference the top trend? Are character limits respected?

Return ONLY the JSON object. Make every challenge feel fresh, clever, and connected to TODAY—like it was written by a witty friend, not a corporate chatbot.`;

  if (examples.length > 0) {
    return basePrompt + buildImprovementExamplesSection(examples);
  }

  return basePrompt;
}

/**
 * Build a focused prompt for regenerating a single challenge
 */
export function buildSingleChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  trends: TrendingTopic[]
): string {
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  return `You need to create a REPLACEMENT ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## ORIGINAL CHALLENGE (REJECTED)
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}

---

## ADMIN FEEDBACK (WHAT WAS WRONG)
${feedback}

---

## AVAILABLE TRENDS
${trendContext}

---

## YOUR TASK
Generate ONE replacement challenge that:
1. **Addresses the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Can use same or different trend** - Pick whichever makes a better challenge
4. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
5. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "the trend you're using",
  "prompt": "the creative clue",
  "answer": "WORD_IN_CAPS",
  "hint": "a helpful nudge",
  "difficulty": "easy|medium|hard",
  "trending_context": "1 sentence: why this matters today"
}

Return ONLY the JSON object.`;
}

/**
 * Build a specialized prompt for partial regeneration
 */
export function buildPartialChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  fieldsToRegenerate: RegenerableField[],
  trends: TrendingTopic[],
  examples: PromptExample[]
): string {
  const isFullRegeneration = fieldsToRegenerate.includes('all');
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  const examplesSection = examples.length > 0
    ? `
---

## LEARN FROM PAST MISTAKES (Do NOT repeat these)
${examples.slice(0, 10).map((ex, i) => `
### Bad Example ${i + 1} (${ex.challenge_type})
- Prompt: "${ex.original_prompt}"
- Answer: "${ex.original_answer}"
- Problem: ${ex.feedback}${ex.improved_prompt ? `\n- Better prompt: "${ex.improved_prompt}"` : ''}${ex.improved_answer ? `\n- Better answer: "${ex.improved_answer}"` : ''}
`).join('')}
`
    : '';

  let fieldInstructions: string;
  let preserveInstructions: string;

  if (isFullRegeneration) {
    fieldInstructions = `Generate a completely NEW replacement challenge that addresses the feedback.`;
    preserveInstructions = '';
  } else {
    const fieldsToChange = fieldsToRegenerate.join(', ');

    fieldInstructions = `Generate ONLY new values for: **${fieldsToChange}**`;
    preserveInstructions = `
**IMPORTANT - PRESERVE EXACTLY (copy verbatim):**
${!fieldsToRegenerate.includes('prompt') ? `- prompt: "${original.prompt}"` : ''}
${!fieldsToRegenerate.includes('answer') ? `- answer: "${original.answer}"` : ''}
${!fieldsToRegenerate.includes('hint') && original.hint ? `- hint: "${original.hint}"` : ''}
${original.options && !fieldsToRegenerate.includes('options') ? `- options: ${JSON.stringify(original.options)}` : ''}
- type: "${original.type}" (always keep)
- trend_topic: "${original.trend_topic}" (always keep)
- difficulty: "${original.difficulty}" (always keep)
- trending_context: "${original.trending_context}" (always keep)
`;
  }

  return `You need to ${isFullRegeneration ? 'create a REPLACEMENT' : 'PARTIALLY UPDATE a'} ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## CURRENT CHALLENGE${isFullRegeneration ? ' (REJECTED - replace entirely)' : ' (update specific fields only)'}
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}
- Trending Context: "${original.trending_context}"
${original.options ? `- Options: ${JSON.stringify(original.options)}` : ''}

---

## ADMIN FEEDBACK
${feedback}
${preserveInstructions}
---

## AVAILABLE TRENDS
${trendContext}
${examplesSection}
---

## YOUR TASK
${fieldInstructions}

**Requirements:**
1. **Address the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
4. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "${original.trend_topic}",
  "prompt": "${isFullRegeneration || fieldsToRegenerate.includes('prompt') ? 'your new creative clue' : original.prompt}",
  "answer": "${isFullRegeneration || fieldsToRegenerate.includes('answer') ? 'NEW_ANSWER_IN_CAPS' : original.answer}",
  "hint": "${isFullRegeneration || fieldsToRegenerate.includes('hint') ? 'your new helpful nudge' : (original.hint || '')}",
  "difficulty": "${original.difficulty}",
  "trending_context": "${original.trending_context}"${original.options ? `,
  "options": ${isFullRegeneration || fieldsToRegenerate.includes('options') ? '["new", "options", "array"]' : JSON.stringify(original.options)}` : ''}
}

Return ONLY the JSON object.`;
}
