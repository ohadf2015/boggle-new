import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import logger from '@/utils/logger';
import { withCronLock } from '@/backend/redis/locking';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Content calendar — EN + HE posts indexed by day of week (0=Sun … 5=Fri)
// ---------------------------------------------------------------------------

interface Post {
  image: string;
  caption: string;
  hashtags: string;
}

const EN_POSTS: Record<number, Post> = {
  0: {
    image: 'lexiclash-insta-brain-science-v7.png',
    caption: `Your brain on word games 🧠⚡\n\nScience says playing word games just 5 minutes a day:\n\n🔹 Memory improves 23% after 8 weeks (Univ. of Michigan)\n🔹 Word game players know 12,500 more words on average (Ghent University)\n🔹 Pattern recognition 15% faster in daily players (NEJM 2019)\n🔹 Cognitive decline risk drops 48% (Einstein College of Medicine)\n\nNot just a game. A brain workout.\n\n5 min/day. That's all it takes.\nFree at lexiclash.live — link in bio`,
    hashtags: '#braintraining #wordgames #neuroscience #cognitivehealth #brainhealth #mentalfitness #vocabulary #wordgame #brainworkout #didyouknow #sciencefacts #lexiclash #boggle #scrabble #wordle #puzzlegame #brainpower #memorytips #smartereveryday #mindgames',
  },
  1: {
    image: 'lexiclash-insta-vocab-chart.png',
    caption: `How many words do you actually know? 📊\n\nHere's how vocabulary grows through life:\n\n👶 Age 2 → 300 words\n🧒 Age 6 → 6,000 words\n🎓 Age 12 → 20,000 words\n🧑 Average adult → 30,000 words\n🏆 Word game player → 42,500 words\n\nThat last bar? That's you 💪\n\nStart growing yours at lexiclash.live — link in bio`,
    hashtags: '#vocabulary #wordpower #didyouknow #languagefacts #wordgames #braintraining #infographic #education #learnenglish #vocabularybuilding #wordnerd #logophile #lexiclash #brainhealth #smartereveryday #languagelearning #funfacts #puzzlegame #dailychallenge',
  },
  2: {
    image: 'lexiclash-insta-find-15-words-v3.png',
    caption: `Think you're good with words? Prove it 👇\n\nP  R  E  S\nT  O  N  A\nI   L  D  E\nG  H  A  R\n\nRules: Connect adjacent letters. Each letter used once per word. Min 3 letters.\n\nDrop your longest word in the comments 🔥\n\n🔥 = found 10 | 🤯 = found 15 | 🧠 = found 20+\n\nHint: there's a 7-letter word hiding in there...\n\nPlay unlimited grids free — lexiclash.live (link in bio)`,
    hashtags: '#wordpuzzle #brainteaser #canyousolveit #puzzletime #wordgame #boggle #riddle #challenge #braintraining #puzzle #wordchallenge #thinkfast #lexiclash #gametime #smartgames #mindgames #wordnerd #puzzleoftheday #commentbelow',
  },
  3: {
    image: 'lexiclash-insta-game-comparison.png',
    caption: `The ultimate word game showdown 🏆⚡\n\nSCRABBLE (1948)\n• 150M+ copies sold\n• 45 min average game\n\nWORDLE (2021)\n• 2M+ daily players\n• 4 min average game\n\nLEXICLASH (2024)\n• Real-time battles\n• 3 min average game\n• Trains speed + vocabulary\n\nWhich one are you? Drop it in the comments 👇\n\nTry the fastest word game at lexiclash.live — link in bio`,
    hashtags: '#scrabble #wordle #boggle #wordgames #comparison #gamers #puzzlegame #braintraining #versus #gamenight #wordgame #mobilegaming #lexiclash #indiegame #casualgaming #wordnerd #funfacts #gaming #gamecommunity',
  },
  4: {
    image: 'lexiclash-insta-3min-brain.png',
    caption: `What happens in your brain during ONE round of a word game ⚡🧠\n\n0:00 — Visual cortex processes 16 letters in 200ms\n0:15 — Brain checks 3,000 word patterns per SECOND\n0:30 — Finger traces path before conscious decision\n1:00 — Dopamine fires on every valid word\n1:30 — Prefrontal cortex enters flow state\n3:00 — New word pathways encoded into memory\n\nAll of that. In one round. 🤯\n\nMake those minutes count — lexiclash.live (link in bio)`,
    hashtags: '#neuroscience #brainscience #flowstate #dopamine #braintraining #wordgames #psychology #cognitivescience #brainpower #mindblown #didyouknow #sciencefacts #lexiclash #mentalhealth #focus #productivity #mindgames #smartereveryday',
  },
  5: {
    image: 'lexiclash-insta-english-numbers.png',
    caption: `The English language is WILD 🤯📊\n\n171,476 words currently in use\n47,156 obsolete words\n~1,000 new words added every year\n\nThe longest word? 45 letters:\npneumonoultramicroscopicsilicovolcanoconiosis 😅\n\nMost common letter: E (13%)\nMost common starting letter: S\nAverage person uses only 20,000 out of 171K+\n\nHow many do YOU know? lexiclash.live — link in bio`,
    hashtags: '#englishlanguage #languagefacts #didyouknow #funfacts #vocabulary #wordnerd #linguistics #learnenglish #wordgames #infographic #education #lexiclash #logophile #languagelearning #trivia #amazingfacts #knowledgeispower',
  },
};

const HE_POSTS: Record<number, Post> = {
  0: {
    image: 'lexiclash-insta-brain-science-he.png',
    caption: `המוח שלך על משחקי מילים 🧠⚡\n\nמה המדע אומר על 5 דקות משחק ביום:\n\n🔹 זיכרון משתפר ב-23% אחרי 8 שבועות (אוניברסיטת מישיגן)\n🔹 שחקני משחקי מילים מכירים 12,500 מילים יותר (אוניברסיטת גנט)\n🔹 זיהוי דפוסים מהיר ב-15% בשחקנים יומיים (NEJM 2019)\n🔹 סיכון לירידה קוגניטיבית יורד ב-48% (מכללת איינשטיין)\n\nלא סתם משחק. אימון למוח.\n\n5 דקות ביום. זה כל מה שצריך.\nבחינם ב-lexiclash.live — לינק בביו`,
    hashtags: '#משחקימילים #אימוןמוח #בריאותהמוח #עברית #מדע #עובדותמעניינות #בוגל #סקראבל #אוצרמילים #למידה #מוח #זיכרון #lexiclash #braintraining #wordgames #hebrew #israelgaming #freetoplay',
  },
  1: {
    image: 'lexiclash-insta-vocab-chart-he.png',
    caption: `כמה מילים אתה באמת מכיר? 📊\n\n👶 גיל 2 → 300 מילים\n🧒 גיל 6 → 6,000 מילים\n🎓 גיל 12 → 20,000 מילים\n🧑 מבוגר ממוצע → 30,000 מילים\n🏆 שחקן משחקי מילים → 42,500 מילים\n\nהעמודה האחרונה? זה אתה 💪\n\nהתחל לגדול ב-lexiclash.live — לינק בביו`,
    hashtags: '#אוצרמילים #משחקימילים #עברית #למידה #חינוך #עובדותמעניינות #מוח #אימוןמוח #ישראל #lexiclash #wordgames #hebrew #infographic #education #funfacts',
  },
  2: {
    image: 'lexiclash-insta-brain-funfact-he.png',
    caption: `הידעת? 🧠\n\nמשחק מילים 5 דקות ביום = זיכרון חד ב-23%\n\nזה יותר ממה שרוב האפליקציות "אימון מוח" שגובות 40 שקל בחודש יכולות להציע.\n\nהתירוץ שלך לשחק עוד 😏\nבחינם ב-lexiclash.live — לינק בביו\n\nשמרו ושלחו למישהו שצריך לשמוע את זה 💾`,
    hashtags: '#הידעת #אימוןמוח #משחקימילים #זיכרון #מוח #בריאות #עובדותמעניינות #ישראל #lexiclash #braintraining #funfact #hebrew #freetoplay',
  },
  3: {
    image: 'lexiclash-insta-game-comparison-he.png',
    caption: `הקרב הגדול של משחקי המילים 🏆⚡\n\nסקראבל (1948)\n• 150 מיליון+ נמכרו\n• משחק ממוצע: 45 דקות\n\nוורדל (2021)\n• 2 מיליון+ שחקנים ביום\n• משחק ממוצע: 4 דקות\n\nLexiClash (2024)\n• קרבות בזמן אמת\n• משחק ממוצע: 3 דקות\n• מאמן מהירות + אוצר מילים\n\nמה המשחק שלכם? כתבו בתגובות 👇\n\nlexiclash.live — לינק בביו`,
    hashtags: '#סקראבל #וורדל #בוגל #משחקימילים #השוואה #גיימרים #משחק #ישראל #lexiclash #wordgames #gaming #versus #hebrew #israelgaming',
  },
  4: {
    image: 'lexiclash-insta-3min-brain-he.png',
    caption: `מה קורה במוח שלך בסיבוב אחד של משחק מילים ⚡🧠\n\n0:00 — קליפת המוח מעבדת 16 אותיות ב-200 אלפיות שנייה\n0:15 — המוח בודק 3,000 דפוסי מילים בשנייה\n0:30 — האצבע נעה לפני שהחלטת במודע\n1:00 — דופמין נשפך על כל מילה תקינה\n1:30 — קליפת המצח נכנסת למצב זרימה\n3:00 — מסלולי מילים חדשים נשמרים בזיכרון\n\nכל זה. בסיבוב אחד. 🤯\n\nlexiclash.live — לינק בביו`,
    hashtags: '#מדעהמוח #דופמין #אימוןמוח #משחקימילים #פסיכולוגיה #מוח #ריכוז #עובדותמעניינות #lexiclash #neuroscience #braintraining #hebrew #israel',
  },
  5: {
    image: 'lexiclash-insta-hebrew-numbers.png',
    caption: `השפה העברית היא מטורפת 🤯📊\n\n75,000 מילים בשימוש נוכחי\n~500 מילים חדשות בכל שנה\nשפה בת 3,000 שנה\n\nהמילה הארוכה ביותר? אלקטרואנצפלוגרפיה 😅\n\nהאות הנפוצה ביותר: י (10%)\nהאדם הממוצע משתמש ב-8,000 מילים בלבד\nעברית היא השפה היחידה שהוחייתה מחדש\n\nכמה מילים אתה מכיר? lexiclash.live — לינק בביו`,
    hashtags: '#עברית #שפהעברית #עובדותמעניינות #ישראל #שפות #למידה #אוצרמילים #חינוך #משחקימילים #lexiclash #hebrew #hebrewlanguage #israelifacts #funfacts',
  },
};

// ---------------------------------------------------------------------------
// Instagram Graph API
// ---------------------------------------------------------------------------

const GRAPH_API = 'https://graph.facebook.com/v21.0';

async function createAndPublish(
  accountId: string,
  token: string,
  imageUrl: string,
  caption: string,
  hashtags: string,
  label: string
): Promise<{ mediaId: string }> {
  // Step 1: Create media container
  logger.log(`[IG:${label}] Creating container for ${imageUrl}`);
  const containerRes = await fetch(`${GRAPH_API}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const container = await containerRes.json() as { id?: string; error?: { message: string } };
  if (container.error) throw new Error(`Container: ${container.error.message}`);

  // Step 2: Wait for processing
  logger.log(`[IG:${label}] Waiting for image processing...`);
  await new Promise((r) => setTimeout(r, 12_000));

  // Step 3: Publish
  logger.log(`[IG:${label}] Publishing...`);
  const publishRes = await fetch(`${GRAPH_API}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json() as { id?: string; error?: { message: string } };
  if (published.error) throw new Error(`Publish: ${published.error.message}`);

  // Step 4: Hashtags as first comment
  if (hashtags) {
    logger.log(`[IG:${label}] Adding hashtags comment...`);
    await fetch(`${GRAPH_API}/${published.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: hashtags, access_token: token }),
    });
  }

  logger.log(`[IG:${label}] Done! Media ID: ${published.id}`);
  return { mediaId: published.id! };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Cron Job: Instagram Auto-Publisher
 *
 * Posts today's content to EN and/or HE Instagram accounts.
 *
 * Query params:
 *   ?lang=en    Post EN only
 *   ?lang=he    Post HE only
 *   (none)      Post both
 *
 * Scheduling:
 *   External cron (cron-job.org / Railway cron):
 *   - EN: 0 16 * * 0-5  (16:00 UTC = 18:00 Israel)
 *     URL: https://lexiclash.live/api/cron/instagram-post?lang=en
 *   - HE: 0 18 * * 0-5  (18:00 UTC = 20:00 Israel)
 *     URL: https://lexiclash.live/api/cron/instagram-post?lang=he
 *   - Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check (same pattern as other cron routes)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const expected = `Bearer ${cronSecret}`;

    if (
      !cronSecret ||
      !authHeader ||
      authHeader.length !== expected.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 6) {
      return NextResponse.json({ message: 'Saturday — no posts scheduled' });
    }

    const lang = request.nextUrl.searchParams.get('lang');
    // Per-lang lock — EN and HE legitimately run on different cron schedules.
    const lockKey = `instagram-post-${lang || 'all'}`;
    const lockTtl = lang ? 90_000 : 180_000;

    const locked = await withCronLock(lockKey, lockTtl, async () => {
      const siteUrl = process.env.SITE_URL || 'https://lexiclash.live';
      const results: { lang: string; status: string; mediaId?: string; error?: string }[] = [];

      // Post EN
      if (!lang || lang === 'en') {
        const post = EN_POSTS[dayOfWeek];
        const token = process.env.INSTAGRAM_ACCESS_TOKEN_EN;
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID_EN;

        if (post && token && accountId) {
          try {
            const imageUrl = `${siteUrl}/images/promo/${post.image}`;
            const { mediaId } = await createAndPublish(accountId, token, imageUrl, post.caption, post.hashtags, 'EN');
            results.push({ lang: 'en', status: 'published', mediaId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.error('[IG:EN] Failed:', msg);
            results.push({ lang: 'en', status: 'failed', error: msg });
          }
        } else {
          results.push({ lang: 'en', status: 'skipped', error: post ? 'Missing credentials' : 'No post for today' });
        }
      }

      // Post HE
      if (!lang || lang === 'he') {
        const post = HE_POSTS[dayOfWeek];
        const token = process.env.INSTAGRAM_ACCESS_TOKEN_HE;
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID_HE;

        if (post && token && accountId) {
          try {
            const imageUrl = `${siteUrl}/images/promo/${post.image}`;
            const { mediaId } = await createAndPublish(accountId, token, imageUrl, post.caption, post.hashtags, 'HE');
            results.push({ lang: 'he', status: 'published', mediaId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.error('[IG:HE] Failed:', msg);
            results.push({ lang: 'he', status: 'failed', error: msg });
          }
        } else {
          results.push({ lang: 'he', status: 'skipped', error: post ? 'Missing credentials' : 'No post for today' });
        }
      }

      return results;
    });

    if (locked.status === 'skipped') {
      logger.log(`[IG Cron] ${lockKey}: skipped (already running)`);
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ day: dayOfWeek, results: locked.result });
  } catch (error) {
    logger.error('[IG Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
