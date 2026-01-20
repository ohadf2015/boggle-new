# Admin Dashboard Setup Guide

This guide explains how to enable admin access for the LexiClash admin dashboard in development.

## Overview

The admin dashboard provides tools for:
- 📊 Live game monitoring
- 👥 Player management
- 📖 Dictionary management
- 📅 Daily challenge scheduling
- 🌐 Wikipedia word curation
- ✨ Daily Buzz challenge management
- 📧 Email testing
- 📈 Web vitals monitoring

**Location:** `http://localhost:3001/[locale]/admin`

## Security Model

Admin access uses **database-driven authorization**:
- ✅ JWT token authentication (Supabase)
- ✅ `is_admin` flag verification in `profiles` table
- ✅ Multi-layer security checks

**Production:** Only specific user IDs have admin access (configured in migrations)
**Development:** Use the dev admin grant tool (this guide)

---

## Quick Start (Development)

### Step 0: Get Your Supabase Service Role Key (REQUIRED)

The admin grant script needs your **service role key** to modify the database.

**Option A: Automated Setup (Recommended)**

```bash
npm run setup:supabase
```

This will prompt you to paste your service role key and automatically update `.env`.

**Option B: Manual Setup**

1. Go to: **https://supabase.com/dashboard/project/hdtmpkicuxvtmvrmtybx/settings/api**
2. Find **service_role** key (marked as **secret**)
3. Click **Reveal** and copy the key
4. Open `.env` file and update:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Your actual key
```

5. Save and restart dev server

**⚠️ Important:** Keep this key secret! It has admin privileges.

### Step 1: Verify Supabase Connection

Make sure your `.env` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://hdtmpkicuxvtmvrmtybx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # From Step 0
```

### Step 2: Create a User Account

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3001/en`
3. Sign up with email/password
4. Verify your email if required

### Step 3: Grant Admin Access

Run the admin grant tool:

```bash
npm run grant-dev-admin
```

**Interactive prompts:**

1. **Select identification method:**
   - Option 1: Email address (recommended)
   - Option 2: User ID (UUID)
   - Option 3: Current session (not yet implemented)

2. **Enter credentials:**
   ```
   Enter user email: your-email@example.com
   ```

3. **Confirm action:**
   ```
   Type "grant admin" to confirm: grant admin
   ```

4. **Success!**
   ```
   ✅ SUCCESS! Admin access granted.

   📍 Access the admin dashboard at:
      http://localhost:3001/en/admin
   ```

### Step 4: Access Admin Dashboard

1. **Refresh your browser** (or log out/in)
2. Navigate to: `http://localhost:3001/en/admin`
3. You should see the admin dashboard

**Note:** If you still see "Access Denied", try:
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- Clear browser cache
- Log out and log back in

---

## Safety Features

The `grant-dev-admin` script has multiple safety layers:

### 1. Environment Checks
- ❌ **Blocks production:** Cannot run if `NODE_ENV=production`
- ❌ **Detects hosting:** Blocks Railway, Vercel, Render, Heroku
- ✅ **Development only:** Only runs in local dev environment

### 2. Explicit Confirmation
- Requires typing `"grant admin"` to confirm
- Shows user details before granting
- Clear cancellation option

### 3. Idempotent Operation
- Safe to run multiple times
- Won't break if user already has admin access
- No side effects

### 4. Validation
- Verifies Supabase connection
- Validates user existence
- Checks UUID format
- Provides clear error messages

---

## Troubleshooting

### "Missing Supabase configuration"

**Problem:** Environment variables not set

**Solution:**
```bash
# Create .env.local with Supabase credentials
cp .env.example .env.local
# Edit .env.local and add your Supabase URL and keys
```

### "No user found with email"

**Problem:** User doesn't exist in Supabase Auth

**Solution:**
1. Sign up at `http://localhost:3001/en`
2. Verify email if required
3. Run `npm run grant-dev-admin` again

### "Admin access required" after granting

**Problem:** Browser cache or session not updated

**Solution:**
1. Hard refresh browser (Cmd+Shift+R)
2. Clear application cache in DevTools
3. Log out and log back in
4. Verify in Supabase dashboard that `is_admin = true`

### "This script cannot run in production"

**Problem:** Production environment detected

**Solution:**
- ✅ This is correct behavior - script is development-only
- For production, use database migration `011_add_admin.sql`
- Add your user UUID to the migration

---

## Manual Method (Alternative)

If the script doesn't work, you can grant admin access manually via Supabase dashboard:

### Via Supabase Dashboard UI

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Table Editor** → **profiles**
4. Find your user row
5. Edit the `is_admin` column to `true`
6. Save changes

### Via SQL Editor

1. Go to: **SQL Editor** in Supabase dashboard
2. Run this query:

```sql
-- Replace with your user email or ID
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
-- OR
WHERE id = 'your-user-uuid';
```

3. Refresh your browser

---

## Production Setup

**For production environments, use migration-based admin grants:**

1. Edit `supabase/migrations/011_add_admin.sql`
2. Add your production user UUID:

```sql
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
    'production-user-uuid-1',
    'production-user-uuid-2'
);
```

3. Deploy migration to production

**⚠️ Never use `grant-dev-admin` in production!**

---

## Admin Dashboard Features

Once you have admin access, you can:

### Live Monitor
- Real-time game sessions
- Active player count
- Connection status
- Performance metrics

### Player Management (`/admin/players`)
- View all players
- Player statistics
- Gifting system
- Account management

### Dictionary Management (`/admin/dictionary`)
- Community word submissions
- Approve/reject words
- Word quality control

### Daily Challenge (`/admin/words`)
- Schedule daily words
- View upcoming challenges
- Generate retry links
- Player attempt tracking

### Wikipedia Words (`/admin/wikipedia-words`)
- Curate Wikipedia-sourced words
- Review candidates
- Approve/reject
- Quality filters

### Daily Buzz (`/admin/daily-buzz`)
- Trend-based challenges
- Generate new buzzwords
- Image management
- Prompt template editor

### Web Vitals (`/admin/web-vitals`)
- Core Web Vitals monitoring
- Performance metrics
- User experience data

---

## Architecture Notes

### Authentication Flow

```
1. User logs in → JWT token issued
2. Browser sends token in Authorization header
3. API route validates JWT via Supabase
4. Checks is_admin flag in profiles table
5. Grants/denies access
```

### Security Layers

| Layer | Check | Location |
|-------|-------|----------|
| Frontend | `useAuth()` hook checks `isAdmin` | `app/[locale]/admin/page.tsx` |
| API Routes | `verifyAdminAuth()` validates token + flag | `lib/auth/adminAuth.ts` |
| Database | RLS policies restrict admin-only tables | Supabase migrations |

### Related Files

- **Admin Auth:** `lib/auth/adminAuth.ts`
- **Admin Page:** `app/[locale]/admin/page.tsx`
- **Grant Script:** `scripts/grant-dev-admin.js`
- **Migration:** `supabase/migrations/011_add_admin.sql`

---

## FAQ

**Q: Can I have multiple admin users in dev?**
A: Yes! Run `npm run grant-dev-admin` for each user.

**Q: Will this affect production?**
A: No. The script has multiple safety checks preventing production use.

**Q: Can I revoke admin access?**
A: Yes. Update `is_admin = false` in Supabase dashboard or run SQL:
```sql
UPDATE profiles SET is_admin = false WHERE email = 'user@example.com';
```

**Q: Do I need to run this every time?**
A: No. Once granted, admin access persists in the database.

**Q: What if I deploy to staging?**
A: Use the same migration approach as production. Don't use dev script in any deployed environment.

---

## Support

If you encounter issues:

1. Check Supabase connection is working
2. Verify environment variables are set
3. Review troubleshooting section above
4. Check Supabase dashboard for user/profile data
5. Review server logs for authentication errors

**Common logs to check:**
```bash
# Server logs (backend/routes/admin.ts)
[AdminAuth] Auth successful for user@example.com

# Or error logs:
[AdminAuth] User not admin: user@example.com
```
