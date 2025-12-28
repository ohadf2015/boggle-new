/**
 * Seed Admin Data
 * Populates database with sample community words and bot words for testing admin panel
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample admin user ID (you'll need to replace with a real admin user)
let adminUserId = null;

// Sample community words data
const sampleCommunityWords = [
  // English words with various vote statuses
  { word: 'brainiac', language: 'en', likes: 12, dislikes: 1 }, // Validated (net: 11)
  { word: 'zephyr', language: 'en', likes: 8, dislikes: 2 }, // Pending review (net: 6)
  { word: 'quizzify', language: 'en', likes: 7, dislikes: 2 }, // Pending review (net: 5)
  { word: 'bloggish', language: 'en', likes: 4, dislikes: 3 }, // New (net: 1)
  { word: 'fakeword', language: 'en', likes: 2, dislikes: 8 }, // Rejected (net: -6)
  { word: 'nonsensical', language: 'en', likes: 1, dislikes: 0 }, // New (net: 1)

  // Hebrew words
  { word: 'בלוג', language: 'he', likes: 15, dislikes: 0 }, // Validated (net: 15)
  { word: 'קליק', language: 'he', likes: 6, dislikes: 1 }, // Pending review (net: 5)
  { word: 'מיילים', language: 'he', likes: 3, dislikes: 2 }, // New (net: 1)

  // Swedish words
  { word: 'surfa', language: 'sv', likes: 11, dislikes: 1 }, // Validated (net: 10)
  { word: 'mejla', language: 'sv', likes: 7, dislikes: 1 }, // Pending review (net: 6)

  // Japanese words
  { word: 'ブログ', language: 'ja', likes: 9, dislikes: 0 }, // Pending review (net: 9)
];

// Sample bot words (words submitted by bots that need review)
const sampleBotWords = [
  // Valid bot words that got downvoted
  { word: 'lexicon', language: 'en', likes: 2, dislikes: 5 }, // Bot found valid but users disagree
  { word: 'quixotic', language: 'en', likes: 3, dislikes: 4 }, // Bot found valid but users disagree

  // Invalid bot words that got heavily downvoted
  { word: 'xzqrt', language: 'en', likes: 0, dislikes: 8 }, // Gibberish
  { word: 'qqq', language: 'en', likes: 1, dislikes: 6 }, // Too short/invalid
];

async function getAdminUser() {
  console.log('🔍 Looking for admin user...');
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_admin', true)
    .limit(1);

  if (error) {
    console.error('❌ Error fetching admin user:', error.message);
    return null;
  }

  if (!admins || admins.length === 0) {
    console.warn('⚠️  No admin user found. You need to set is_admin=true for a user first.');
    console.log('   Run: UPDATE profiles SET is_admin = true WHERE username = \'your_username\';');
    return null;
  }

  const admin = admins[0];
  console.log(`✅ Found admin: ${admin.username} (${admin.id})`);
  return admin.id;
}

async function clearExistingData() {
  console.log('\n🧹 Clearing existing seed data...');

  // Delete votes from seed games
  const { error: votesError } = await supabase
    .from('word_votes')
    .delete()
    .like('game_code', 'seed_%');

  if (votesError) {
    console.warn('⚠️  Could not clear old votes:', votesError.message);
  } else {
    console.log('✅ Cleared old votes');
  }
}

async function seedCommunityWords() {
  console.log('\n📝 Seeding community words...');

  for (const wordData of sampleCommunityWords) {
    const { word, language, likes, dislikes } = wordData;
    const gameCode = `seed_community_${word}_${language}`;

    console.log(`   Adding "${word}" (${language}) - ${likes} likes, ${dislikes} dislikes`);

    // Insert like votes - use different guest IDs to avoid unique constraint violations
    for (let i = 0; i < likes; i++) {
      await supabase.from('word_votes').insert({
        word,
        language,
        guest_id: `seed_guest_like_${word}_${language}_${i}`,
        game_code: `${gameCode}_like_${i}`,
        vote_type: 'like',
        is_bot_word: false
      });
    }

    // Insert dislike votes - use different guest IDs
    for (let i = 0; i < dislikes; i++) {
      await supabase.from('word_votes').insert({
        word,
        language,
        guest_id: `seed_guest_dislike_${word}_${language}_${i}`,
        game_code: `${gameCode}_dislike_${i}`,
        vote_type: 'dislike',
        is_bot_word: false
      });
    }
  }

  console.log('✅ Community words seeded');
}

async function seedBotWords() {
  console.log('\n🤖 Seeding bot words...');

  for (const wordData of sampleBotWords) {
    const { word, language, likes, dislikes } = wordData;
    const gameCode = `seed_bot_${word}_${language}`;

    console.log(`   Adding bot word "${word}" (${language}) - ${likes} likes, ${dislikes} dislikes`);

    // Insert like votes (marked as bot words) - use different guest IDs
    for (let i = 0; i < likes; i++) {
      await supabase.from('word_votes').insert({
        word,
        language,
        guest_id: `seed_bot_guest_like_${word}_${language}_${i}`,
        game_code: `${gameCode}_like_${i}`,
        vote_type: 'like',
        is_bot_word: true
      });
    }

    // Insert dislike votes (marked as bot words) - use different guest IDs
    for (let i = 0; i < dislikes; i++) {
      await supabase.from('word_votes').insert({
        word,
        language,
        guest_id: `seed_bot_guest_dislike_${word}_${language}_${i}`,
        game_code: `${gameCode}_dislike_${i}`,
        vote_type: 'dislike',
        is_bot_word: true
      });
    }
  }

  console.log('✅ Bot words seeded');
}

async function verifyData() {
  console.log('\n🔍 Verifying seeded data...');

  // Check word_votes
  const { count: votesCount } = await supabase
    .from('word_votes')
    .select('*', { count: 'exact', head: true })
    .like('game_code', 'seed_%');

  console.log(`   word_votes: ${votesCount || 0} seed votes`);

  // Check word_scores
  const { data: scores } = await supabase
    .from('word_scores')
    .select('word, language, likes_count, dislikes_count, net_score')
    .order('net_score', { ascending: false });

  if (scores && scores.length > 0) {
    console.log(`   word_scores: ${scores.length} words aggregated`);
    console.log('\n   Top 5 words by net score:');
    scores.slice(0, 5).forEach(s => {
      console.log(`      ${s.word} (${s.language}): net ${s.net_score} (${s.likes_count}↑ ${s.dislikes_count}↓)`);
    });
  } else {
    console.log('   word_scores: No data');
  }

  // Check bot words
  const { count: botCount } = await supabase
    .from('word_votes')
    .select('*', { count: 'exact', head: true })
    .eq('is_bot_word', true);

  console.log(`   bot words: ${botCount || 0} votes for bot-submitted words`);
}

async function main() {
  console.log('🌱 Seeding Admin Panel Data\n');
  console.log('=' .repeat(50));

  try {
    // Get admin user
    adminUserId = await getAdminUser();
    if (!adminUserId) {
      console.error('\n❌ Cannot seed without an admin user');
      process.exit(1);
    }

    // Clear existing seed data
    await clearExistingData();

    // Seed data
    await seedCommunityWords();
    await seedBotWords();

    // Verify
    await verifyData();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Seeding complete!');
    console.log('\n📊 You can now view the data in the admin panel at:');
    console.log('   http://localhost:3000/en/admin');

  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  }
}

main();
