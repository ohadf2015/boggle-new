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
import { EN_POSTS as EN_CALENDAR, HE_POSTS as HE_CALENDAR, type InstagramPost } from "../lib/instagram/postCalendar";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ---------------------------------------------------------------------------
// Content Calendar
// ---------------------------------------------------------------------------

interface Post extends InstagramPost {
  day: number; // 0=Sun, 1=Mon, ... 5=Fri
}

const SITE_URL = process.env.SITE_URL || "https://lexiclash.live";

// Single source of truth shared with the auto-post cron. Copy rules live there.
const toList = (byDay: Record<number, InstagramPost>): Post[] =>
  Object.entries(byDay).map(([day, post]) => ({ day: Number(day), ...post }));

const EN_POSTS: Post[] = toList(EN_CALENDAR);
const HE_POSTS: Post[] = toList(HE_CALENDAR);

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
