/**
 * Instagram Auto-Publisher for LexiClash
 *
 * Uses the official Instagram Graph API to schedule and publish posts.
 *
 * Setup:
 * 1. Create a Facebook App at developers.facebook.com
 * 2. Add "Instagram Graph API" product
 * 3. Get a Page Access Token (long-lived) with permissions:
 *    - instagram_basic
 *    - instagram_content_publish
 *    - pages_show_list
 *    - pages_read_engagement
 * 4. Get your Instagram Business Account ID
 * 5. Add to .env.local:
 *    INSTAGRAM_ACCESS_TOKEN_EN=<token for EN account>
 *    INSTAGRAM_ACCOUNT_ID_EN=<IG business account ID for EN>
 *    INSTAGRAM_ACCESS_TOKEN_HE=<token for HE account>
 *    INSTAGRAM_ACCOUNT_ID_HE=<IG business account ID for HE>
 *    SITE_URL=https://lexiclash.live  (your Railway deployment URL where images are served from /images/promo/)
 *
 * Usage:
 *   npx ts-node scripts/instagram-publisher.ts preview     # Preview what will post today
 *   npx ts-node scripts/instagram-publisher.ts post-today   # Post today's content (both accounts)
 *   npx ts-node scripts/instagram-publisher.ts post-today en # Post today's EN only
 *   npx ts-node scripts/instagram-publisher.ts post-today he # Post today's HE only
 *   npx ts-node scripts/instagram-publisher.ts schedule      # Run as daemon, posts daily at scheduled times
 *   npx ts-node scripts/instagram-publisher.ts post-all      # Publish all posts now (for testing)
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ---------------------------------------------------------------------------
// Content Calendar
// ---------------------------------------------------------------------------

interface Post {
  day: number; // 0=Sun, 1=Mon, ... 5=Fri
  image: string; // filename in /public/images/promo/
  caption: string;
  hashtags: string;
}

const SITE_URL = process.env.SITE_URL || "https://lexiclash.live";

const EN_POSTS: Post[] = [
  {
    day: 0, // Sunday
    image: "lexiclash-insta-brain-science-v7.png",
    caption: `Your brain on word games 🧠⚡

Science says playing word games just 5 minutes a day:

🔹 Memory improves 23% after 8 weeks (Univ. of Michigan)
🔹 Word game players know 12,500 more words on average (Ghent University)
🔹 Pattern recognition 15% faster in daily players (NEJM 2019)
🔹 Cognitive decline risk drops 48% (Einstein College of Medicine)

Not just a game. A brain workout.

5 min/day. That's all it takes.
Free at lexiclash.live — link in bio`,
    hashtags: `#braintraining #wordgames #neuroscience #cognitivehealth #brainhealth #mentalfitness #vocabulary #wordgame #brainworkout #didyouknow #sciencefacts #lexiclash #boggle #scrabble #wordle #puzzlegame #brainpower #memorytips #smartereveryday #mindgames`,
  },
  {
    day: 1, // Monday
    image: "lexiclash-insta-vocab-chart.png",
    caption: `How many words do you actually know? 📊

Here's how vocabulary grows through life:

👶 Age 2 → 300 words
🧒 Age 6 → 6,000 words
🎓 Age 12 → 20,000 words
🧑 Average adult → 30,000 words
🏆 Word game player → 42,500 words

That last bar? That's you 💪

Every round you play, you're building neural pathways to new words your brain keeps forever.

Start growing yours at lexiclash.live — link in bio`,
    hashtags: `#vocabulary #wordpower #didyouknow #languagefacts #wordgames #braintraining #infographic #education #learnenglish #englishwords #vocabularybuilding #wordnerd #logophile #lexiclash #brainhealth #smartereveryday #languagelearning #funfacts #puzzlegame #dailychallenge`,
  },
  {
    day: 2, // Tuesday
    image: "lexiclash-insta-find-15-words-v3.png",
    caption: `Think you're good with words? Prove it 👇

P  R  E  S
T  O  N  A
I   L  D  E
G  H  A  R

Rules: Connect adjacent letters (horizontal, vertical, diagonal). Each letter used once per word. Minimum 3 letters.

Drop your longest word in the comments 🔥

🔥 = found 10
🤯 = found 15
🧠 = found 20+

Hint: there's a 7-letter word hiding in there...

Play unlimited grids free — lexiclash.live (link in bio)`,
    hashtags: `#wordpuzzle #brainteaser #canyousolveit #puzzletime #wordgame #boggle #riddle #challenge #braintraining #puzzle #wordchallenge #thinkfast #lexiclash #gametime #smartgames #iqtest #mindgames #wordnerd #puzzleoftheday #commentbelow`,
  },
  {
    day: 3, // Wednesday
    image: "lexiclash-insta-game-comparison.png",
    caption: `The ultimate word game showdown 🏆⚡

SCRABBLE (1948)
• 150M+ copies sold
• 45 min average game
• 20-30 words per game

WORDLE (2021)
• 2M+ daily players
• 4 min average game
• 1 word per game

LEXICLASH (2024)
• Real-time battles
• 3 min average game
• 15-40 words per game
• Trains speed + vocabulary

Which one are you? Drop it in the comments 👇

Try the fastest word game at lexiclash.live — link in bio`,
    hashtags: `#scrabble #wordle #boggle #wordgames #comparison #gamers #puzzlegame #braintraining #versus #gamenight #wordgame #tabletopgames #mobilegaming #lexiclash #indiegame #casualgaming #wordnerd #funfacts #gaming #gamecommunity`,
  },
  {
    day: 4, // Thursday
    image: "lexiclash-insta-3min-brain.png",
    caption: `What happens in your brain during ONE round of a word game ⚡🧠

0:00 — Your visual cortex processes 16 letters in 200 milliseconds
0:15 — Your brain checks 3,000 word patterns per SECOND
0:30 — Your finger starts tracing before you consciously decide
1:00 — Dopamine fires on every valid word (that's the rush)
1:30 — Prefrontal cortex enters flow state / hyperfocus
3:00 — New word pathways are encoded into long-term memory

All of that. In one round. 🤯

Your brain is doing more in 3 minutes of word games than in 30 minutes of scrolling.

Make those minutes count — lexiclash.live (link in bio)`,
    hashtags: `#neuroscience #brainscience #flowstate #dopamine #braintraining #wordgames #psychology #cognitivescience #brainpower #mindblown #didyouknow #sciencefacts #lexiclash #mentalhealth #focus #productivity #brainhack #mindgames #smartereveryday`,
  },
  {
    day: 5, // Friday
    image: "lexiclash-insta-english-numbers.png",
    caption: `The English language is WILD 🤯📊

171,476 words currently in use
47,156 words are now obsolete
~1,000 new words added every year

The longest word? 45 letters:
pneumonoultramicroscopicsilicovolcanoconiosis
(good luck fitting that on a game board 😅)

The most common letter: E (13%)
The most common starting letter: S
The average person uses only 20,000 out of 171,000+ words

How many do YOU know? Test yourself free at lexiclash.live — link in bio`,
    hashtags: `#englishlanguage #languagefacts #didyouknow #funfacts #vocabulary #wordnerd #linguistics #english #learnenglish #wordgames #infographic #education #lexiclash #logophile #wordoftheday #languagelearning #trivia #amazingfacts #knowledgeispower`,
  },
];

const HE_POSTS: Post[] = [
  {
    day: 0,
    image: "lexiclash-insta-brain-science-he.png",
    caption: `המוח שלך על משחקי מילים 🧠⚡

מה המדע אומר על 5 דקות משחק ביום:

🔹 זיכרון משתפר ב-23% אחרי 8 שבועות (אוניברסיטת מישיגן)
🔹 שחקני משחקי מילים מכירים 12,500 מילים יותר בממוצע (אוניברסיטת גנט)
🔹 זיהוי דפוסים מהיר ב-15% בשחקנים יומיים (NEJM 2019)
🔹 סיכון לירידה קוגניטיבית יורד ב-48% (מכללת איינשטיין)

לא סתם משחק. אימון למוח.

5 דקות ביום. זה כל מה שצריך.
בחינם ב-lexiclash.live — לינק בביו`,
    hashtags: `#משחקימילים #אימוןמוח #בריאותהמוח #עברית #מדע #עובדותמעניינות #משחקמילים #בוגל #סקראבל #חידה #אוצרמילים #למידה #מוח #זיכרון #lexiclash #braintraining #wordgames #hebrew #israelgaming #freetoplay`,
  },
  {
    day: 1,
    image: "lexiclash-insta-vocab-chart-he.png",
    caption: `כמה מילים אתה באמת מכיר? 📊

ככה אוצר המילים גדל לאורך החיים:

👶 גיל 2 → 300 מילים
🧒 גיל 6 → 6,000 מילים
🎓 גיל 12 → 20,000 מילים
🧑 מבוגר ממוצע → 30,000 מילים
🏆 שחקן משחקי מילים → 42,500 מילים

העמודה האחרונה? זה אתה 💪

כל סיבוב שאתה משחק, המוח שלך בונה מסלולים חדשים למילים שנשארות לתמיד.

התחל לגדול ב-lexiclash.live — לינק בביו`,
    hashtags: `#אוצרמילים #משחקימילים #עברית #למידה #חינוך #עובדותמעניינות #מוח #אימוןמוח #משחקמילים #ישראל #lexiclash #wordgames #hebrew #infographic #education #funfacts`,
  },
  {
    day: 2,
    image: "lexiclash-insta-brain-funfact-he.png",
    caption: `הידעת? 🧠

משחק מילים 5 דקות ביום = זיכרון חד ב-23%

זה יותר ממה שרוב האפליקציות "אימון מוח" שגובות 40 שקל בחודש יכולות להציע.

התירוץ שלך לשחק עוד 😏
בחינם ב-lexiclash.live — לינק בביו

שמרו ושלחו למישהו שצריך לשמוע את זה 💾`,
    hashtags: `#הידעת #אימוןמוח #משחקימילים #זיכרון #מוח #בריאות #עובדותמעניינות #ישראל #lexiclash #braintraining #funfact #hebrew #freetoplay`,
  },
  {
    day: 3,
    image: "lexiclash-insta-game-comparison-he.png",
    caption: `הקרב הגדול של משחקי המילים 🏆⚡

סקראבל (1948)
• 150 מיליון+ עותקים נמכרו
• משחק ממוצע: 45 דקות
• 20-30 מילים למשחק

וורדל (2021)
• 2 מיליון+ שחקנים ביום
• משחק ממוצע: 4 דקות
• מילה אחת למשחק

LexiClash (2024)
• קרבות בזמן אמת
• משחק ממוצע: 3 דקות
• 15-40 מילים למשחק
• מאמן מהירות + אוצר מילים

מה המשחק שלכם? כתבו בתגובות 👇

נסו את משחק המילים הכי מהיר ב-lexiclash.live — לינק בביו`,
    hashtags: `#סקראבל #וורדל #בוגל #משחקימילים #השוואה #גיימרים #משחק #ישראל #lexiclash #wordgames #gaming #versus #hebrew #israelgaming #casualgaming`,
  },
  {
    day: 4,
    image: "lexiclash-insta-3min-brain-he.png",
    caption: `מה קורה במוח שלך בסיבוב אחד של משחק מילים ⚡🧠

0:00 — קליפת המוח החזותית מעבדת 16 אותיות ב-200 אלפיות שנייה
0:15 — המוח בודק 3,000 דפוסי מילים בשנייה
0:30 — האצבע מתחילה לנוע לפני שהחלטת במודע
1:00 — דופמין נשפך על כל מילה תקינה (זה הראש)
1:30 — קליפת המצח נכנסת למצב זרימה / היפר-פוקוס
3:00 — מסלולי מילים חדשים נשמרים בזיכרון ארוך טווח

כל זה. בסיבוב אחד. 🤯

המוח שלך עושה יותר ב-3 דקות של משחק מילים מאשר ב-30 דקות של גלילה.

תנו לדקות האלה לעבוד — lexiclash.live (לינק בביו)`,
    hashtags: `#מדעהמוח #דופמין #אימוןמוח #משחקימילים #פסיכולוגיה #מוח #ריכוז #פרודוקטיביות #עובדותמעניינות #lexiclash #neuroscience #braintraining #hebrew #israel`,
  },
  {
    day: 5,
    image: "lexiclash-insta-hebrew-numbers.png",
    caption: `השפה העברית היא מטורפת 🤯📊

75,000 מילים בשימוש נוכחי
~500 מילים חדשות נוספות בכל שנה
שפה בת 3,000 שנה

המילה הארוכה ביותר?
אלקטרואנצפלוגרפיה
(בהצלחה למצוא את זה על לוח המשחק 😅)

האות הנפוצה ביותר: י (10%)
האדם הממוצע משתמש ב-8,000 מילים בלבד
עברית היא השפה היחידה בהיסטוריה שהוחייתה מחדש

כמה מילים אתה מכיר? בדוק בחינם ב-lexiclash.live — לינק בביו`,
    hashtags: `#עברית #שפהעברית #עובדותמעניינות #ישראל #שפות #למידה #אוצרמילים #חינוך #משחקימילים #lexiclash #hebrew #hebrewlanguage #israelifacts #funfacts #language #education`,
  },
];

// ---------------------------------------------------------------------------
// Instagram Graph API helpers
// ---------------------------------------------------------------------------

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface AccountConfig {
  token: string;
  accountId: string;
  label: string;
}

function getAccountConfig(lang: "en" | "he"): AccountConfig {
  const suffix = lang.toUpperCase();
  const token = process.env[`INSTAGRAM_ACCESS_TOKEN_${suffix}`];
  const accountId = process.env[`INSTAGRAM_ACCOUNT_ID_${suffix}`];

  if (!token || !accountId) {
    throw new Error(
      `Missing env vars: INSTAGRAM_ACCESS_TOKEN_${suffix} and/or INSTAGRAM_ACCOUNT_ID_${suffix}`
    );
  }

  return { token, accountId, label: lang.toUpperCase() };
}

async function createMediaContainer(
  account: AccountConfig,
  imageUrl: string,
  caption: string
): Promise<string> {
  const url = `${GRAPH_API}/${account.accountId}/media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: account.token,
    }),
  });

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (data.error) throw new Error(`[${account.label}] Media container error: ${data.error.message}`);
  return data.id!;
}

async function publishMedia(
  account: AccountConfig,
  containerId: string
): Promise<string> {
  const url = `${GRAPH_API}/${account.accountId}/media_publish`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: account.token,
    }),
  });

  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (data.error) throw new Error(`[${account.label}] Publish error: ${data.error.message}`);
  return data.id!;
}

async function commentOnMedia(
  account: AccountConfig,
  mediaId: string,
  comment: string
): Promise<void> {
  const url = `${GRAPH_API}/${mediaId}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: comment,
      access_token: account.token,
    }),
  });

  const data = (await res.json()) as { error?: { message: string } };
  if (data.error) console.warn(`[${account.label}] Comment warning: ${data.error.message}`);
}

// ---------------------------------------------------------------------------
// Post logic
// ---------------------------------------------------------------------------

function getImageUrl(filename: string): string {
  return `${SITE_URL}/images/promo/${filename}`;
}

function getTodayPost(posts: Post[]): Post | null {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
  return posts.find((p) => p.day === dayOfWeek) || null;
}

async function publishPost(
  lang: "en" | "he",
  post: Post
): Promise<void> {
  const account = getAccountConfig(lang);
  const imageUrl = getImageUrl(post.image);

  console.log(`\n[${account.label}] Publishing: ${post.image}`);
  console.log(`  Image URL: ${imageUrl}`);

  // Step 1: Create media container
  console.log(`  Creating media container...`);
  const containerId = await createMediaContainer(account, imageUrl, post.caption);
  console.log(`  Container ID: ${containerId}`);

  // Step 2: Wait for processing (IG needs time to fetch the image)
  console.log(`  Waiting for image processing (10s)...`);
  await new Promise((r) => setTimeout(r, 10_000));

  // Step 3: Publish
  console.log(`  Publishing...`);
  const mediaId = await publishMedia(account, containerId);
  console.log(`  Published! Media ID: ${mediaId}`);

  // Step 4: Add hashtags as first comment
  if (post.hashtags) {
    console.log(`  Adding hashtags as first comment...`);
    await commentOnMedia(account, mediaId, post.hashtags);
    console.log(`  Hashtags added.`);
  }

  console.log(`  [${account.label}] Done ✓`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function preview() {
  const dayOfWeek = new Date().getDay();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  console.log(`\nToday is ${dayNames[dayOfWeek]}\n`);

  if (dayOfWeek === 6) {
    console.log("Saturday — no posts scheduled (Shabbat rest)");
    return;
  }

  const enPost = getTodayPost(EN_POSTS);
  const hePost = getTodayPost(HE_POSTS);

  if (enPost) {
    console.log(`[EN] ${enPost.image}`);
    console.log(`  Caption: ${enPost.caption.substring(0, 80)}...`);
    console.log(`  Image: ${getImageUrl(enPost.image)}\n`);
  }

  if (hePost) {
    console.log(`[HE] ${hePost.image}`);
    console.log(`  Caption: ${hePost.caption.substring(0, 80)}...`);
    console.log(`  Image: ${getImageUrl(hePost.image)}\n`);
  }
}

async function postToday(langFilter?: "en" | "he") {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 6) {
    console.log("Saturday — no posts (Shabbat rest)");
    return;
  }

  if (!langFilter || langFilter === "en") {
    const enPost = getTodayPost(EN_POSTS);
    if (enPost) await publishPost("en", enPost);
    else console.log("[EN] No post scheduled for today");
  }

  if (!langFilter || langFilter === "he") {
    const hePost = getTodayPost(HE_POSTS);
    if (hePost) await publishPost("he", hePost);
    else console.log("[HE] No post scheduled for today");
  }

  console.log("\nAll done! 🎉");
}

async function postAll() {
  console.log("Publishing ALL posts (for testing)...\n");
  for (const post of EN_POSTS) {
    await publishPost("en", post);
    await new Promise((r) => setTimeout(r, 5_000)); // rate limit buffer
  }
  for (const post of HE_POSTS) {
    await publishPost("he", post);
    await new Promise((r) => setTimeout(r, 5_000));
  }
  console.log("\nAll posts published! 🎉");
}

async function schedule() {
  // Dynamic import for node-cron (it's a CommonJS module)
  const cron = await import("node-cron");

  // EN posts at 18:00 Israel time (UTC+2 in winter, UTC+3 in summer)
  // HE posts at 20:00 Israel time
  // Using UTC: 16:00 for EN, 18:00 for HE (winter) — adjust for DST manually
  console.log("Instagram publisher daemon started 🚀");
  console.log("EN posts scheduled: daily at 16:00 UTC (18:00 Israel)");
  console.log("HE posts scheduled: daily at 18:00 UTC (20:00 Israel)\n");

  cron.schedule("0 16 * * 0-5", async () => {
    console.log(`[${new Date().toISOString()}] EN posting triggered`);
    try {
      await postToday("en");
    } catch (e) {
      console.error("EN post failed:", e);
    }
  });

  cron.schedule("0 18 * * 0-5", async () => {
    console.log(`[${new Date().toISOString()}] HE posting triggered`);
    try {
      await postToday("he");
    } catch (e) {
      console.error("HE post failed:", e);
    }
  });

  // Keep alive
  console.log("Press Ctrl+C to stop.\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const [command, langArg] = process.argv.slice(2);

switch (command) {
  case "preview":
    preview();
    break;
  case "post-today":
    postToday(langArg as "en" | "he" | undefined);
    break;
  case "post-all":
    postAll();
    break;
  case "schedule":
    schedule();
    break;
  default:
    console.log(`
LexiClash Instagram Publisher

Usage:
  npx ts-node scripts/instagram-publisher.ts preview       Preview today's posts
  npx ts-node scripts/instagram-publisher.ts post-today    Post today's content (both accounts)
  npx ts-node scripts/instagram-publisher.ts post-today en Post EN only
  npx ts-node scripts/instagram-publisher.ts post-today he Post HE only
  npx ts-node scripts/instagram-publisher.ts post-all      Post ALL content (testing)
  npx ts-node scripts/instagram-publisher.ts schedule      Run as daemon (cron-based)

Required env vars in .env.local:
  INSTAGRAM_ACCESS_TOKEN_EN   Long-lived token for EN account
  INSTAGRAM_ACCOUNT_ID_EN     Instagram Business Account ID (EN)
  INSTAGRAM_ACCESS_TOKEN_HE   Long-lived token for HE account
  INSTAGRAM_ACCOUNT_ID_HE     Instagram Business Account ID (HE)
  SITE_URL                    Where images are hosted (default: https://lexiclash.live)
    `);
}
