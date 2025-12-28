# Admin Panel Setup Guide

## ✅ What Was Fixed

The admin panel now has **sample data** populated in the database for testing:

### Bot Words (4 words with player feedback)
- `xzqrt` (en): 0↑ 9↓ - gibberish word
- `qqq` (en): 2↑ 6↓ - invalid short word
- `lexicon` (en): 3↑ 5↓ - valid but downvoted
- `quixotic` (en): 4↑ 4↓ - valid but mixed votes

### Community Words (491 total words)
- **4 Validated** (≥10 net score): בלוג, brainiac, surfa, ブログ
- **86 Pending Review** (3-9 net score): zephyr, quizzify, קליק, etc.
- **97 New** (0-2 net score): Recent submissions
- **304 Rejected** (<0 net score): Community rejected

## 📊 Accessing the Admin Panel

### 1. Start the Application

```bash
cd fe-next
npm run dev
```

The app will run on http://localhost:3000

### 2. Log In as Admin

You need to:
1. Log in with your account
2. Make sure your account has `is_admin = true` in the database

To set your account as admin, run this SQL command in Supabase:

```sql
UPDATE profiles
SET is_admin = true
WHERE username = 'your_username';
```

Or find your user ID and use:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = 'your-user-id';
```

### 3. Navigate to Admin Panel

Once logged in as admin, go to:
```
http://localhost:3000/en/admin
```

You should see tabs for:
- **Overview**: General stats
- **Players**: Top players
- **Traffic Sources**: UTM tracking
- **Activity**: Daily activity charts
- **Community Words**: Review community-submitted words ✅
- **Bot Words**: Review bot-submitted words ✅

## 🔧 Database Tables

### `word_votes`
Stores individual votes from players:
- `word`, `language`: The word being voted on
- `user_id` or `guest_id`: Who voted
- `vote_type`: 'like' or 'dislike'
- `is_bot_word`: TRUE if this was a bot-submitted word
- `game_code`: Which game the vote came from

### `word_scores`
Aggregated scores (automatically updated via database trigger):
- `word`, `language`: The word
- `likes_count`, `dislikes_count`: Vote counts
- `net_score`: likes - dislikes (generated column)
- `is_potentially_valid`: TRUE when net_score ≥ 6 (generated column)

### `bot_word_blacklist`
Words that bots should never use:
- `word`, `language`: The blacklisted word
- `blacklisted_by`: Admin who added it
- `reason`: Why it was blacklisted

## 🌱 Re-seeding Data

To refresh the sample data:

```bash
cd fe-next
node scripts/seed-admin-data.js
```

To verify the data:

```bash
node scripts/verify-admin-data.js
```

## 🎯 Admin Actions

### Community Words Tab
- **Approve**: Add positive votes to push word toward validation (net score ≥ 10)
- **+ Dict**: Approve and add to permanent dictionary file
- **Reject**: Add negative votes
- **Ban**: Reject and add to blacklist

### Bot Words Tab
- **Approve**: Remove from blacklist and add positive votes
- **Disapprove**: Add to blacklist and add negative votes

## 🐛 Troubleshooting

### "No data" in Admin Panel

1. **Check if you're logged in as admin:**
   ```sql
   SELECT id, username, is_admin FROM profiles WHERE is_admin = true;
   ```

2. **Check if data exists:**
   ```bash
   node scripts/verify-admin-data.js
   ```

3. **Check backend server:**
   - Backend should be running on port 3001
   - Check browser console for API errors
   - Check Network tab for `/api/admin/*` requests

4. **Check Supabase connection:**
   - Verify `.env` has correct `NEXT_PUBLIC_SUPABASE_URL`
   - Verify `.env` has correct `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### API Returns "Auth service not available"

This means Supabase is not configured. Check your `.env` file for:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Tables Don't Exist

Run the migrations:
```bash
npx supabase db push
```

Or manually run migrations in this order:
1. `005_word_voting.sql` - Creates word_votes and word_scores tables
2. `013_add_bot_word_tracking.sql` - Adds bot word tracking
