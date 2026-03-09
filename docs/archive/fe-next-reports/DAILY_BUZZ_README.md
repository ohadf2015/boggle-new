# Daily Buzz - Trend-Based Word Challenges

## Overview

**Daily Buzz** is a new daily challenge mode for LexiClash that generates word puzzles based on real-time Google Trends data. Unlike the time-pressured "Word Hunt Survival," Daily Buzz offers an untimed, culturally-relevant experience where players solve 5-7 mini-challenges about what's trending today.

## Features

- **Real-Time Trends**: Uses SERP API to fetch Google Trends for each language/region
- **AI-Generated Challenges**: Gemini 2.0 Flash Thinking creates unique puzzles daily
- **5 Challenge Types**:
  - **SCRAMBLED**: Unscramble trending words
  - **FILL IT**: Complete trending phrases
  - **CHAIN**: Word ladder puzzles
  - **SPOT ON**: Multiple choice definitions
  - **TRIO**: Find words connecting three trends
- **Multi-Language**: Fully localized for English, Hebrew, Swedish, Japanese, Spanish
- **Neo-Brutalist UI**: Bold, playful design with AI-generated hero images
- **No Time Pressure**: Players can complete challenges at their own pace

## Architecture

### Backend Services

#### `backend/services/serpApiClient.ts`
- Fetches Google Trends from SERP API
- 24-hour Redis caching
- Database persistence
- Fallback to yesterday's data on errors

#### `backend/services/imagenClient.ts`
- Generates abstract concept images using Vertex AI Imagen 3
- Neo-brutalist post-processing with Sharp
- Uploads to Supabase Storage
- Aggressive caching for cost optimization
- **CRITICAL**: Images must be abstract and NOT reveal answers

#### `backend/services/buzzGenerator.ts`
- Orchestrates daily challenge generation
- Uses Gemini 2.0 Flash Thinking (most advanced model)
- Validates words against game dictionaries
- Generates 5-7 challenges from trending topics
- Supports all 5 languages

### API Routes

#### `backend/routes/buzzChallenge.ts`
- `GET /api/buzz/:date/:language` - Fetch daily challenge
- `POST /api/buzz/submit` - Submit completed challenge
- `GET /api/buzz/leaderboard/:date/:language` - Daily leaderboard
- `GET /api/buzz/stats/:date/:language` - Aggregate stats
- `GET /api/buzz/check-played/:date/:language` - Check if user played
- `GET /api/buzz/streak/:playerId` - Get user's streak
- `POST /api/buzz/admin/generate` - Manual generation (admin only)

#### `app/api/feature-flags/check/route.ts`
- `POST /api/feature-flags/check` - Check if user can access feature

#### `app/api/admin/feature-flags/route.ts` (Admin-only)
- `GET /api/admin/feature-flags` - List all feature flags
- `GET /api/admin/feature-flags?flagName=X` - Get specific flag
- `POST /api/admin/feature-flags` - Create/update feature flag
- `DELETE /api/admin/feature-flags?flagName=X` - Delete feature flag

### Frontend Components

#### Main Components
- `DailyChallengeLanding.tsx` - Dual mode selection (Word Hunt vs Buzz)
- `BuzzChallenge.tsx` - Main orchestrator
- `BuzzReadyScreen.tsx` - Pre-game with trending preview
- `BuzzGameScreen.tsx` - Gameplay with dynamic challenge rendering
- `BuzzResultsScreen.tsx` - Results with score, stats, sharing

#### Challenge Type Components (`components/buzz/challenges/`)
- `ScrambledChallenge.tsx`
- `FillBlankChallenge.tsx`
- `ChainChallenge.tsx`
- `SpotOnChallenge.tsx`
- `TrioChallenge.tsx`

#### Admin Dashboard
- `components/admin/DailyBuzzAdminPanel.tsx` - Admin control panel
- `app/[locale]/admin/daily-buzz/page.tsx` - Admin page route

**Access**: Navigate to `/{locale}/admin/daily-buzz` (e.g., `/en/admin/daily-buzz`)

**Features**:
- Manual challenge generation (all languages or single)
- Date selector for regenerating past challenges
- Real-time generation status and results
- Duration tracking
- Error handling and detailed error messages
- Quick links to API endpoints

#### Utilities & Hooks
- `backend/utils/featureFlags.ts` - Feature flag utilities
- `hooks/useFeatureFlag.ts` - React hook for feature flags
- `hooks/useDailyBuzzImages.ts` - Specific hook for image visibility
- `scripts/init-feature-flags.ts` - Initialize feature flags

### Database Schema (Supabase)

#### Tables Created:
- `feature_flags` - Admin-only feature control
- `serp_trends_cache` - Cache SERP API responses
- `buzz_image_cache` - Track image reuse
- `daily_buzz_challenges` - Store challenges
- `daily_buzz_attempts` - Track player attempts
- `buzz_streaks` - Manage player streaks

### Cron Job

**File**: `app/api/cron/generate-daily-buzz/route.ts`

Runs daily at 00:00 UTC to generate challenges for all 5 languages.

#### Railway Deployment Options

**Option 1: External Cron Service (Recommended)**

Use a free external cron service to trigger the endpoint:

Services:
- [cron-job.org](https://cron-job.org) - Free, reliable
- [EasyCron](https://www.easycron.com) - Free tier available
- [Cron-Tab.com](https://www.cron-tab.com) - Simple UI

Setup:
```
Schedule: 0 0 * * * (daily at midnight UTC)
URL: https://your-app.railway.app/api/cron/generate-daily-buzz
Method: GET
Header: Authorization: Bearer YOUR_CRON_SECRET
```

**Option 2: GitHub Actions**

Create `.github/workflows/daily-buzz-cron.yml`:
```yaml
name: Daily Buzz Generation
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at 00:00 UTC
  workflow_dispatch:  # Manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Buzz Generation
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.railway.app/api/cron/generate-daily-buzz
```

**Option 3: Internal node-cron (Optional)**

Install `node-cron`:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Then in `server.ts`, add:
```typescript
import { startDailyBuzzCron } from './backend/services/cronScheduler';

// After server starts
startDailyBuzzCron();
```

**Manual Trigger via Admin Dashboard**

Visit: `https://your-app.railway.app/{locale}/admin/daily-buzz`

Or use cURL:
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://your-app.railway.app/api/cron/generate-daily-buzz
```

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:

```bash
# SERP API (Google Trends)
SERPAPI_KEY=your_serpapi_key_here

# Google Cloud (Vertex AI)
GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_PROJECT=your-project-id

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (already configured)
REDIS_URL=redis://your-redis-url

# Cron Security
CRON_SECRET=your_cron_secret
ADMIN_SECRET=your_admin_secret
```

### 2. Supabase Storage

Create a public bucket named `daily-challenges`:
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `daily-challenges`
3. Enable public access
4. Set CORS policy to allow all origins

### 3. Google Cloud Setup

1. Create project at https://console.cloud.google.com/
2. Enable APIs:
   - Vertex AI API
   - Imagen API
3. Create service account:
   - Role: Vertex AI User
   - Download JSON key
4. Copy JSON contents to `GOOGLE_CREDENTIALS_JSON` (single line)

### 4. SERP API Setup

1. Sign up at https://serpapi.com/
2. Get API key (100 calls/month free)
3. Add to `.env.local`

### 5. Run Database Migrations

Database tables were created using Supabase MCP tool. If you need to recreate:

```bash
# Tables are already created via MCP
# Check `migrations/` folder for SQL if manual migration needed
```

### 6. Test the Feature

```bash
# Start development server
npm run dev

# Generate test challenge (requires admin secret)
curl -X POST http://localhost:3001/api/buzz/admin/generate \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-13","language":"en"}'

# View in browser
open http://localhost:3001/en/daily
```

## Cost Breakdown

### Daily Costs (Per Day)
- **SERP API**: 5 calls/day (one per region) → **FREE** (100 calls/month free tier)
- **Vertex AI Gemini**: ~$0.02/day for challenge generation
- **Vertex AI Imagen**: ~$0.03/day for image generation (1 image shared)
- **Total**: ~**$1.50/month**

### Cost Optimization Strategies
✅ Single image per day shared across 5 languages (80% savings)
✅ 24-hour Redis caching for SERP API responses
✅ Image reuse for recurring trending topics
✅ Supabase Storage for permanent hosting (no repeated generation)

## Feature Flag System (Admin-Only Visibility)

### Overview

Daily Buzz images are controlled by a feature flag system that allows:
- Admin-only visibility (default)
- Gradual rollout to percentage of users
- Global enable/disable toggle

### Initial Setup

Run the initialization script to create the feature flag:

```bash
npx tsx scripts/init-feature-flags.ts
```

This creates the `daily_buzz_images` flag with:
- **enabled**: true
- **admin_only**: true (only admins see images)
- **rollout_percentage**: 0

### Usage in Code

**Backend:**
```typescript
import { canAccessDailyBuzzImages } from '@/backend/utils/featureFlags';

const canSeeImages = await canAccessDailyBuzzImages(userId);
```

**Frontend (React Hook):**
```typescript
import { useDailyBuzzImages } from '@/hooks/useFeatureFlag';

function BuzzComponent() {
  const { user } = useAuth();
  const { enabled: showImages, loading } = useDailyBuzzImages(user?.id);

  if (loading) return <Spinner />;
  return showImages ? <ImageFeature /> : null;
}
```

### Admin API Endpoints

**List all feature flags:**
```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  https://your-app.railway.app/api/admin/feature-flags
```

**Get specific flag:**
```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  https://your-app.railway.app/api/admin/feature-flags?flagName=daily_buzz_images
```

**Update flag:**
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"flagName":"daily_buzz_images","admin_only":false,"rollout_percentage":50}' \
  https://your-app.railway.app/api/admin/feature-flags
```

**Delete flag:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  "https://your-app.railway.app/api/admin/feature-flags?flagName=daily_buzz_images"
```

### Configuration Options

**Enable for all users:**
```sql
UPDATE feature_flags
SET admin_only = false, rollout_percentage = 100
WHERE flag_name = 'daily_buzz_images';
```

**Gradual rollout (50% of users):**
```sql
UPDATE feature_flags
SET admin_only = false, rollout_percentage = 50
WHERE flag_name = 'daily_buzz_images';
```

**Admin-only mode:**
```sql
UPDATE feature_flags
SET admin_only = true
WHERE flag_name = 'daily_buzz_images';
```

**Disable completely:**
```sql
UPDATE feature_flags
SET enabled = false
WHERE flag_name = 'daily_buzz_images';
```

### How Rollout Works

Rollout uses consistent hashing based on user ID:
- User ID is hashed with MD5
- Hash determines if user is in rollout percentage
- Same user always gets same result (deterministic)
- Distribution is even across user base

Example: 50% rollout means:
- 50% of users will always see images
- 50% of users will never see images
- No randomness - consistent experience per user

## Testing

### Run Tests
```bash
npm run test
```

### Test Files
- `components/buzz/__tests__/BuzzChallenge.test.tsx`
- `components/buzz/challenges/__tests__/ScrambledChallenge.test.tsx`

### Manual Testing Checklist
- [ ] Landing page shows both Word Hunt and Daily Buzz
- [ ] Buzz challenge fetches today's trends
- [ ] All 5 challenge types render correctly
- [ ] Submit answer updates score
- [ ] Hint system works (-5 points)
- [ ] Results screen shows final score
- [ ] Share functionality works
- [ ] Works in all 5 languages (en, he, sv, ja, es)
- [ ] Hebrew RTL renders correctly (🔥📰)
- [ ] Images display for admins only

## UI Images Generated

Three neo-brutalist images were created:
1. **daily-buzz-logo-icon.png** - Main branding icon
2. **challenge-type-icons.png** - Icons for 5 challenge types
3. **daily-buzz-hero-banner.png** - Hero banner

Location: `/Users/ohadfisher/generated_images/`

## Deployment

### Railway Deployment

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add Daily Buzz feature"
   git push origin master
   ```

2. **Deploy to Railway**
   - Railway will auto-deploy from GitHub
   - Or trigger manual deployment via Railway dashboard

3. **Add Environment Variables in Railway**

   Go to Railway project → Variables tab:
   ```bash
   # Required
   SERPAPI_KEY=your_serpapi_key
   GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_CLOUD_PROJECT=your-project-id
   ADMIN_SECRET=your_admin_secret
   CRON_SECRET=your_cron_secret

   # Already configured
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   REDIS_URL=...
   ```

4. **Set up Cron Job**

   Choose one option from the [Cron Job](#cron-job) section above:
   - External cron service (recommended)
   - GitHub Actions workflow
   - Internal node-cron (requires additional setup)

5. **Initialize Feature Flags**
   ```bash
   # SSH into Railway or run locally
   npx tsx scripts/init-feature-flags.ts
   ```

6. **Test Deployment**
   - Visit `https://your-app.railway.app/en/daily`
   - Click "Daily Buzz"
   - Verify challenge loads

### Manual Triggers

**Via Admin Dashboard:**
```
https://your-app.railway.app/en/admin/daily-buzz
```

**Via cURL:**
```bash
# Generate for all languages (today)
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://your-app.railway.app/api/cron/generate-daily-buzz

# Generate for specific language and date
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-15","language":"en"}' \
  https://your-app.railway.app/api/cron/generate-daily-buzz
```

**Via Cron Service:**
```bash
# Schedule this GET request daily at 00:00 UTC
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.railway.app/api/cron/generate-daily-buzz
```

## Troubleshooting

### Images Not Showing
- Check admin feature flag: `SELECT * FROM feature_flags WHERE flag_name = 'daily_buzz_images'`
- Verify Supabase Storage bucket is public
- Check browser console for CORS errors

### Challenges Not Generating
- Verify SERP API key is valid
- Check Redis connection
- Review cron logs in Railway dashboard (Deploy → Logs)
- Test manual generation via admin dashboard: `/en/admin/daily-buzz`
- Check cron service logs (if using external cron)
- Verify CRON_SECRET or ADMIN_SECRET is set correctly

### Dictionary Validation Errors
- Ensure word is in game dictionary for target language
- Check buzzGenerator.ts for validation logic
- Review AI prompt for word extraction

## Future Enhancements

- [ ] Daily Buzz leaderboards by language
- [ ] Streak rewards (bonus points, badges)
- [ ] Challenge difficulty selection
- [ ] User-submitted trending topic suggestions
- [ ] Social sharing with OG images
- [ ] Push notifications for new challenges

## Credits

- **SERP API**: Google Trends data
- **Vertex AI**: Gemini 2.0 Flash Thinking (challenges), Imagen 3 (images)
- **Supabase**: Database and storage
- **UX Writing**: Native-feeling translations via ux-writer skill
- **Design**: Neo-brutalist aesthetic inspired by Jackbox Party Pack

## License

Part of LexiClash - proprietary software.
