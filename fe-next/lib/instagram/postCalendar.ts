/**
 * Instagram content calendar shared by the auto-post cron
 * (app/api/cron/instagram-post/route.ts) and the manual publisher
 * (scripts/instagram-publisher.ts). Keys are day of week (0=Sun … 5=Fri).
 *
 * Copy rule: no statistic, percentage or study goes in a caption — or in the
 * image it ships with — unless it is on docs/style/citation-sources.md and
 * the caption names the source. When in doubt, write claim-free copy.
 * RETIRED_CLAIM_IMAGES lists creatives with unsourced stats baked into the
 * artwork; they must not be scheduled again until they are re-made.
 */

export interface InstagramPost {
  image: string;
  caption: string;
  hashtags: string;
}

export const RETIRED_CLAIM_IMAGES: readonly string[] = [
  'lexiclash-insta-brain-science-v6.png',
  'lexiclash-insta-brain-science-v7.png',
  'lexiclash-insta-brain-science-he.png',
  'lexiclash-insta-vocab-chart.png',
  'lexiclash-insta-vocab-chart-he.png',
  'lexiclash-insta-brain-funfact-he.png',
  'lexiclash-insta-brain-funfact-v2.png',
  'lexiclash-insta-brain-funfact-v3.png',
  'lexiclash-insta-brain-funfact-v4.png',
  'lexiclash-insta-brain-funfact-v5.png',
  'lexiclash-insta-3min-brain.png',
  'lexiclash-insta-3min-brain-he.png',
  'lexiclash-insta-3min-brain-he-v2.png',
  'lexiclash-insta-3min-brain-he-v3.png',
  'lexiclash-insta-english-numbers.png',
  'lexiclash-insta-hebrew-numbers.png',
  'lexiclash-insta-daily-streak.png',
  'lexiclash-insta-word-history.png',
  'lexiclash-insta-word-history-he.png',
  'lexiclash-insta-2letter-words.png',
  'lexiclash-insta-game-comparison.png',
  'lexiclash-insta-game-comparison-he.png',
];

export const EN_POSTS: Record<number, InstagramPost> = {
  0: {
    image: 'lexiclash-insta-untranslatable-words.png',
    caption: `Words that don't exist in English 🌍✨\n\n🇩🇪 Kummerspeck: weight gained from emotional eating (literally "grief bacon")\n🇯🇵 Tsundoku: buying books and letting them pile up unread\n🇫🇮 Kalsarikännit: drinking at home in your underwear, no plans to go out\n🇮🇩 Jayus: a joke so bad you can't help but laugh\n🇩🇪 Fernweh: longing for places you've never been\n\nWhich one is you? Tag someone who needs #2 📚\n\nPlay with words free at lexiclash.live — link in bio`,
    hashtags: '#languages #untranslatable #wordnerd #funfacts #vocabulary #linguistics #lexiclash #german #japanese #finnish #words #languagefacts #bookstagram #wordgames',
  },
  1: {
    image: 'lexiclash-insta-5-smart-words.png',
    caption: `5 words that make you sound smarter 🧠✨\n\nEphemeral: lasting a very short time\nUbiquitous: found everywhere\nEloquent: fluent and persuasive\nParadigm: a typical model or pattern\nSerendipity: a happy accident\n\nUse one today and tell us how it went 👇\n\nHunt for more words at lexiclash.live — link in bio`,
    hashtags: '#vocabulary #wordoftheday #wordnerd #logophile #learnenglish #vocabularybuilding #english #words #lexiclash #wordgames #smartwords #languagelearning',
  },
  2: {
    image: 'lexiclash-insta-find-15-words-v3.png',
    caption: `Think you're good with words? Prove it 👇\n\nP  R  E  S\nT  O  N  A\nI   L  D  E\nG  H  A  R\n\nRules: Connect adjacent letters. Each letter used once per word. Min 3 letters.\n\nDrop your longest word in the comments 🔥\n\n🔥 = found 10 | 🤯 = found 15 | 🧠 = found 20+\n\nHint: there's a 7-letter word hiding in there...\n\nPlay unlimited grids free — lexiclash.live (link in bio)`,
    hashtags: '#wordpuzzle #brainteaser #canyousolveit #puzzletime #wordgame #boggle #riddle #challenge #puzzle #wordchallenge #thinkfast #lexiclash #gametime #smartgames #mindgames #wordnerd #puzzleoftheday #commentbelow',
  },
  3: {
    image: 'lexiclash-wordhunt-instagram-en-v4.png',
    caption: `Same clock. Your words vs theirs. ⚔️\n\nWord Hunt is a live word battle: trace words on your grid, rack up points, and outsmart your friends before time runs out.\n\nComment the longest word you've ever found in a word game 👇\n\nPlay free — lexiclash.live (link in bio)`,
    hashtags: '#wordgame #wordhunt #multiplayer #wordbattle #friends #gamenight #puzzlegame #lexiclash #wordnerd #mobilegaming #casualgaming',
  },
  4: {
    image: 'lexiclash-insta-find-10-words.png',
    caption: `Can you find 10 words? 👀\n\nB  R  A  I\nT  O  N  E\nS  L  I  P\nD  A  K  E\n\nRules: Connect adjacent letters. Each letter used once per word. Min 3 letters.\n\nComment your best word. Drop a 🔥 if you found 10+\n\nPlay unlimited grids free — lexiclash.live (link in bio)`,
    hashtags: '#wordpuzzle #brainteaser #canyousolveit #puzzletime #wordgame #boggle #challenge #puzzle #wordchallenge #lexiclash #puzzleoftheday #commentbelow #wordnerd',
  },
  5: {
    image: 'lexiclash-wordhunt-instagram-v3.png',
    caption: `Word Hunt ⚔️ Outsmart your friends.\n\nChallenge a friend to a live word battle. Most words when the clock hits zero wins.\n\nWho are you calling out? Tag them 👇\n\nPlay free — lexiclash.live (link in bio)`,
    hashtags: '#wordgame #wordhunt #multiplayer #challenge #friends #gamenight #puzzlegame #lexiclash #wordnerd #mobilegaming #casualgaming #playwithfriends',
  },
};

export const HE_POSTS: Record<number, InstagramPost> = {
  0: {
    image: 'lexiclash-insta-untranslatable-words-he.png',
    caption: `מילים שלא קיימות בעברית 🌍✨\n\n🇩🇪 Kummerspeck: המשקל שעולה מאכילה רגשית (מילולית: "בייקון של עצב")\n🇯🇵 Tsundoku: לקנות ספרים ולתת להם להיערם בלי לקרוא\n🇫🇮 Kalsarikännit: לשתות בבית בתחתונים, בלי שום תוכנית לצאת\n🇮🇩 Jayus: בדיחה כל כך גרועה שאי אפשר שלא לצחוק\n🇩🇪 Fernweh: געגוע למקומות שעוד לא הייתם בהם\n\nאיזו מהן זה אתם? תייגו מישהו שחייב להכיר את #2 📚\n\nמשחקי מילים בחינם ב-lexiclash.live — לינק בביו`,
    hashtags: '#שפות #מילים #עובדותמעניינות #אוצרמילים #בלשנות #lexiclash #languages #hebrew #israel #wordnerd #bookstagram #משחקימילים',
  },
  1: {
    image: 'lexiclash-wordhunt-instagram-he-v2.png',
    caption: `ציד מילים ⚔️ התחרו בחברים שלכם\n\nקרב מילים בזמן אמת: מי שמוצא יותר מילים עד שהשעון נגמר, מנצח.\n\nאת מי אתם מאתגרים? תייגו 👇\n\nשחקו בחינם — lexiclash.live (לינק בביו)`,
    hashtags: '#משחקימילים #ציד_מילים #אתגר #חברים #ערבמשחקים #עברית #ישראל #lexiclash #wordgame #hebrew #multiplayer',
  },
  3: {
    image: 'lexiclash-wordhunt-instagram-he.png',
    caption: `אותו שעון. המילים שלכם מול שלהם. ⚔️\n\nציד מילים הוא קרב מילים בזמן אמת: מעבירים אצבע על הלוח, צוברים נקודות ומנצחים את החברים לפני שהזמן נגמר.\n\nמה המילה הכי ארוכה שמצאתם אי פעם? כתבו בתגובות 👇\n\nשחקו בחינם — lexiclash.live (לינק בביו)`,
    hashtags: '#משחקימילים #ציד_מילים #קרבמילים #חברים #ערבמשחקים #עברית #ישראל #lexiclash #wordgame #hebrew #multiplayer',
  },
};
