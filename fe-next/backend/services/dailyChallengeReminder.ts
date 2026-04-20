import { isSupabaseConfigured, getSupabase } from '../modules/supabase';
import { sendToUsers } from '../modules/fcmService';
import logger from '../utils/logger';

const WITTY_MESSAGES = [
  { title: 'Your brain called 📞', body: "It wants you to finish today's challenge. Don't keep it waiting!" },
  { title: 'Tick tock, word jock! ⏰', body: "Today's challenge won't solve itself. Get in there!" },
  { title: 'Hey, word wizard! 🧙', body: 'Your daily challenge is waiting. The letters miss you.' },
  { title: "Plot twist: you haven't played yet 📖", body: "Finish today's challenge before the day slips away!" },
  { title: 'The daily challenge is lonely 😢', body: 'Go give it some love before midnight!' },
  { title: 'Words are waiting for you 🎯', body: "Jump in and smash today's daily challenge!" },
  { title: 'Almost forgot? 🤔', body: "Your daily challenge streak depends on you. No pressure!" },
  { title: 'Daily challenge: unsolved 🔍', body: 'The board is set. The letters are ready. Are you?' },
  { title: "Don't let today slip by! 🌙", body: "Solve the daily challenge before the clock strikes midnight." },
  { title: 'One puzzle. Your name on it. ✍️', body: "Today's daily challenge is still waiting for a champion." },
];

export async function sendDailyChallengeReminders(): Promise<void> {
  if (!isSupabaseConfigured()) {
    logger.info('DAILY_REMINDER', 'Supabase not configured, skipping');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = getSupabase();

  const { data, error } = await (supabase as any)
    .from('daily_challenges')
    .select('player_id')
    .eq('challenge_date', today)
    .eq('completed', false);

  if (error) {
    logger.error('DAILY_REMINDER', `Failed to query daily challenges: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    logger.info('DAILY_REMINDER', 'No uncompleted challenges today');
    return;
  }

  const playerIds = [...new Set<string>(data.map((row: { player_id: string }) => row.player_id))];
  const message = WITTY_MESSAGES[Math.floor(Math.random() * WITTY_MESSAGES.length)];

  await sendToUsers(playerIds, {
    title: message.title,
    body: message.body,
    data: { deepLink: '/challenges' },
  });

  logger.info('DAILY_REMINDER', `Sent daily challenge reminder to ${playerIds.length} players`);
}
