import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Auth helper functions
export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
}

export async function signInWithDiscord() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
}

export async function signOut() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return { data: { session: null } };
  return supabase.auth.getSession();
}

export async function getUser() {
  if (!supabase) return { data: { user: null } };
  return supabase.auth.getUser();
}

// Profile helpers
export async function getProfile(userId) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export async function updateProfile(userId, updates) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
}

export async function createProfile(profile) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
}

// Check if username is available
export async function checkUsernameAvailable(username) {
  if (!supabase) return { available: false, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1);

  if (error) return { available: false, error };
  return { available: data.length === 0, error: null };
}

// Leaderboard helpers
export async function getLeaderboard(limit = 100, offset = 0) {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };
  return supabase
    .from('leaderboard')
    .select('*')
    .order('total_score', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function getUserRank(userId) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('leaderboard')
    .select('rank_position, total_score, games_played')
    .eq('player_id', userId)
    .maybeSingle();
}

// Guest token helpers
export async function createGuestToken(tokenHash, stats = {}) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .insert({ token_hash: tokenHash, stats })
    .select()
    .single();
}

export async function getGuestToken(tokenHash) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .single();
}

export async function updateGuestStats(tokenHash, stats) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .update({ stats })
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .select()
    .single();
}

export async function claimGuestToken(tokenHash, userId) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('guest_tokens')
    .update({ claimed_by: userId })
    .eq('token_hash', tokenHash)
    .select()
    .single();
}

// Ranked progress helpers
export async function getRankedProgress(userId) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  return supabase
    .from('ranked_progress')
    .select('*')
    .eq('player_id', userId)
    .single();
}

export async function isSupabaseConfigured() {
  return !!supabase;
}

// Profile picture storage functions
export async function uploadProfilePicture(userId, file) {
  if (!supabase) return { url: null, error: { message: 'Supabase not configured' } };

  const fileExt = file.name.split('.').pop().toLowerCase();
  const fileName = `${userId}/profile.${fileExt}`;

  // Remove any existing profile pictures for this user
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const filesToRemove = extensions.map(ext => `${userId}/profile.${ext}`);
  await supabase.storage.from('profile-pictures').remove(filesToRemove);

  // Upload new file
  const { error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) return { url: null, error };

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName);

  // Add cache-busting timestamp
  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  return { url: urlWithCacheBust, error: null };
}

export async function removeProfilePicture(userId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const filesToRemove = extensions.map(ext => `${userId}/profile.${ext}`);

  const { error } = await supabase.storage
    .from('profile-pictures')
    .remove(filesToRemove);

  return { error };
}
