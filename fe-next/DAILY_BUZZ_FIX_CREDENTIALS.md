# Daily Buzz Not Created - Missing Google Credentials Fix

## Problem Summary
Daily Buzz challenges are not being created because Google Vertex AI credentials are missing.

## Root Cause
The cron scheduler **IS running correctly** at midnight UTC, but generation fails with:
```
[BUZZ] AI generation failed: GOOGLE_CREDENTIALS_JSON environment variable is not set
```

## Error Flow
```
1. Cron triggers at 00:00 UTC ✅
2. startDailyBuzzCron() executes ✅
3. generateDailyBuzz() called for each language ✅
4. getVertexAICredentials() tries to read GOOGLE_CREDENTIALS_JSON ❌
5. Throws error: "GOOGLE_CREDENTIALS_JSON environment variable is not set" ❌
6. Generation fails, no challenges created ❌
```

## Quick Fix

### Step 1: Get Google Cloud Service Account Credentials

#### Option A: Use Existing Credentials (if you have them)
If you already have a Google Cloud service account JSON file:
1. Locate your service account JSON file
2. Copy the entire JSON content
3. Skip to Step 2

#### Option B: Create New Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**:
   - Name: `lexiclash-daily-buzz`
   - Description: `Service account for Daily Buzz challenge generation`
   - Click **Create and Continue**
5. Grant roles:
   - **Vertex AI User** (for Gemini API)
   - **AI Platform Admin** (for model access)
   - Click **Continue** → **Done**
6. Click on the new service account
7. Go to **Keys** tab → **Add Key** → **Create New Key**
8. Select **JSON** format → **Create**
9. Save the downloaded JSON file securely

### Step 2: Add Credentials to Environment

#### Local Development (.env file)
```bash
# Open your .env file
# Add this line (replace with your actual JSON, keep it as one line):
GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-sa@your-project.iam.gserviceaccount.com",...}'
```

**Important**:
- Keep the entire JSON as a single line
- Escape newlines in private_key as `\n`
- Wrap in single quotes to prevent shell interpretation

#### Production (Railway/Vercel/Heroku)

**Railway:**
1. Go to your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Click **New Variable**
5. Name: `GOOGLE_CREDENTIALS_JSON`
6. Value: Paste the JSON (single line, escaped newlines)
7. Click **Add**
8. Redeploy

**Vercel:**
1. Go to your Vercel project
2. Go to **Settings** → **Environment Variables**
3. Add `GOOGLE_CREDENTIALS_JSON`
4. Paste the JSON value
5. Select environment (Production, Preview, Development)
6. Click **Save**
7. Redeploy

**Heroku:**
```bash
heroku config:set GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### Step 3: Verify Configuration

#### Test Locally
```bash
# Start the server
npm run dev

# You should see:
# ✅ [CRON] Google Vertex AI credentials configured
# ✅ Daily Buzz cron scheduler started (runs daily at 00:00 UTC)

# If you see a warning instead:
# ⚠️  [CRON] GOOGLE_CREDENTIALS_JSON not configured - Daily Buzz generation will fail!
# Then the environment variable is not set correctly
```

#### Test Generation Manually
```bash
# Use the test script
npx tsx test-buzz-generation.ts

# Expected output:
# 🧪 Testing Daily Buzz generation...
# Date: 2026-01-26
# Language: en
#
# [BUZZ] Generating Daily Buzz for 2026-01-26, language: en
# [SERP] Fetching fresh trends...
# [BUZZ] AI generation starting...
# ✅ Generation successful!
# Challenges: 5
# Trends: 5
```

#### Check Production Logs
After deployment, wait for next midnight UTC (00:00) and check logs:

**Railway:**
```bash
railway logs
```

**Vercel:**
Check deployment logs in Vercel dashboard

**Heroku:**
```bash
heroku logs --tail
```

Look for:
```
🚀 [CRON] Starting Daily Buzz generation...
📝 [CRON] Generating for en...
✅ [CRON] en complete
📝 [CRON] Generating for he...
✅ [CRON] he complete
...
✨ [CRON] Daily Buzz generation complete in XXXms
```

### Step 4: Verify Challenges in Database

Connect to Supabase and run:
```sql
SELECT challenge_date, language, created_at,
       jsonb_array_length(challenges) as challenge_count
FROM daily_buzz_challenges
WHERE challenge_date = CURRENT_DATE
ORDER BY language;

-- Should return 5 rows (one per language: en, he, sv, ja, es)
```

## Additional Environment Variables

While fixing credentials, also ensure these are configured:

```bash
# Enable all 5 languages (already added in previous fix)
BUZZ_ENABLED_LANGUAGES=en,he,sv,ja,es

# Cron security (already added)
CRON_SECRET=your-secure-random-secret

# Google Cloud location (optional, defaults to us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# SERP API for trend fetching (if not configured)
SERP_API_KEY=your-serp-api-key
```

## Troubleshooting

### Error: "Failed to parse GOOGLE_CREDENTIALS_JSON"
- **Cause**: JSON is malformed or has unescaped quotes
- **Fix**: Ensure the JSON is valid and newlines in private_key are escaped as `\n`

### Error: "Missing required field in credentials: project_id"
- **Cause**: Incomplete JSON or wrong format
- **Fix**: Ensure JSON has `project_id`, `private_key`, and `client_email` fields

### Error: "Permission denied" or "403 Forbidden"
- **Cause**: Service account doesn't have required permissions
- **Fix**: Add **Vertex AI User** role to the service account in Google Cloud Console

### Generation still fails after adding credentials
1. Check server logs for specific error
2. Verify service account has Vertex AI User role
3. Ensure project has Vertex AI API enabled
4. Test credentials with a simple API call:
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/publishers/google/models/gemini-1.5-flash"
   ```

### No error but challenges still not created
1. Check `BUZZ_ENABLED_LANGUAGES` is set to all 5 languages
2. Verify cron scheduler is running (check startup logs)
3. Check server timezone (should be UTC)
4. Manually trigger via admin dashboard to test immediately

## Files Modified

### Fixed
- `backend/services/cronScheduler.ts` - Added startup credential validation
- `.env` - Added GOOGLE_CREDENTIALS_JSON placeholder with instructions

### Created
- `DAILY_BUZZ_FIX_CREDENTIALS.md` - This document
- `test-buzz-generation.ts` - Manual test script

## What Was Working vs What Broke

### Working ✅
- Cron scheduler initialization
- Cron timing (midnight UTC)
- BUZZ_ENABLED_LANGUAGES configuration (now fixed)
- Trend fetching from SERP API
- Database connection

### Broken ❌
- Google Vertex AI credentials missing
- AI generation failing silently
- Challenges not being created

## Prevention

To prevent this in the future:

1. **Add to Deployment Checklist**:
   - [ ] GOOGLE_CREDENTIALS_JSON configured
   - [ ] BUZZ_ENABLED_LANGUAGES=en,he,sv,ja,es
   - [ ] CRON_SECRET set
   - [ ] Test generation manually after deployment

2. **Set Up Monitoring** (Recommended):
   - Add Sentry alerts for cron failures
   - Configure Railway/Vercel to email on error logs
   - Set up daily health check that verifies today's challenges exist

3. **Document in README**:
   - List all required environment variables
   - Link to this fix document
   - Add troubleshooting section

## Next Steps

1. ✅ Add credential validation on startup
2. ⏳ Configure GOOGLE_CREDENTIALS_JSON in environment
3. ⏳ Test generation manually
4. ⏳ Wait for next midnight UTC
5. ⏳ Verify challenges created in database
6. ⏳ Set up monitoring/alerts

## Support

If you still have issues after following this guide:

1. Check server startup logs for credential validation message
2. Run the test script: `npx tsx test-buzz-generation.ts`
3. Check production logs for specific error messages
4. Verify service account permissions in Google Cloud Console
5. Test API access using gcloud CLI

## References

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Vertex AI Authentication](https://cloud.google.com/vertex-ai/docs/authentication)
- [Environment Variables Best Practices](https://12factor.net/config)
- Project Documentation: `DAILY_BUZZ_README.md`
