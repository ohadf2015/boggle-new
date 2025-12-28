/**
 * Verify Admin Data
 * Check that the seeded data exists in the database
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBotWords() {
  console.log('\n🤖 Checking Bot Words...');
  console.log('=' .repeat(50));

  const { data: votes, error } = await supabase
    .from('word_votes')
    .select('word, language, vote_type')
    .eq('is_bot_word', true);

  if (error) {
    console.error('❌ Error fetching bot words:', error.message);
    return;
  }

  // Aggregate by word
  const wordStats = {};
  votes?.forEach(vote => {
    const key = `${vote.word}:${vote.language}`;
    if (!wordStats[key]) {
      wordStats[key] = { word: vote.word, language: vote.language, likes: 0, dislikes: 0 };
    }
    if (vote.vote_type === 'like') {
      wordStats[key].likes++;
    } else {
      wordStats[key].dislikes++;
    }
  });

  const botWords = Object.values(wordStats)
    .map(w => ({ ...w, netScore: w.likes - w.dislikes }))
    .filter(w => w.dislikes > 0)
    .sort((a, b) => b.dislikes - a.dislikes);

  console.log(`Total bot word votes: ${votes?.length || 0}`);
  console.log(`Bot words with dislikes: ${botWords.length}`);

  if (botWords.length > 0) {
    console.log('\nBot words for review:');
    botWords.forEach(w => {
      console.log(`  ${w.word} (${w.language}): ${w.likes}↑ ${w.dislikes}↓ (net: ${w.netScore})`);
    });
  }
}

async function verifyCommunityWords() {
  console.log('\n📝 Checking Community Words...');
  console.log('=' .repeat(50));

  const { data: scores, error } = await supabase
    .from('word_scores')
    .select('word, language, likes_count, dislikes_count, net_score')
    .order('net_score', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching community words:', error.message);
    return;
  }

  console.log(`Total words in database: ${scores?.length || 0} (showing top 20)`);

  if (scores && scores.length > 0) {
    console.log('\nTop community words:');
    scores.forEach((w, i) => {
      const status = w.net_score >= 10 ? '✅ VALIDATED' :
                     w.net_score >= 3 ? '⏳ PENDING REVIEW' :
                     w.net_score < 0 ? '❌ REJECTED' : '🆕 NEW';
      console.log(`  ${i + 1}. ${w.word} (${w.language}): ${w.likes_count}↑ ${w.dislikes_count}↓ = net ${w.net_score} ${status}`);
    });
  }

  // Check by status
  const { data: all } = await supabase
    .from('word_scores')
    .select('net_score');

  if (all) {
    const validated = all.filter(w => w.net_score >= 10).length;
    const pendingReview = all.filter(w => w.net_score >= 3 && w.net_score < 10).length;
    const pending = all.filter(w => w.net_score >= 0 && w.net_score < 3).length;
    const rejected = all.filter(w => w.net_score < 0).length;

    console.log('\nCommunity Words by Status:');
    console.log(`  ✅ Validated (≥10): ${validated}`);
    console.log(`  ⏳ Pending Review (3-9): ${pendingReview}`);
    console.log(`  🆕 New (0-2): ${pending}`);
    console.log(`  ❌ Rejected (<0): ${rejected}`);
  }
}

async function main() {
  console.log('🔍 Verifying Admin Panel Data');
  console.log('=' .repeat(50));

  await verifyBotWords();
  await verifyCommunityWords();

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Verification complete!');
  console.log('\n💡 If you see data above, the database is populated correctly.');
  console.log('   If the admin panel shows no data, check:');
  console.log('   1. Is the user logged in as admin?');
  console.log('   2. Is the backend server running (port 3001)?');
  console.log('   3. Are the API endpoints accessible?');
}

main();
