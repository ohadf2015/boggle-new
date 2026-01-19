# Wikipedia Flow - Production Diagnosis & Fix Guide

**Status:** ✅ Works Locally | ❓ Needs Server Verification

---

## Summary

The Wikipedia word extraction flow **works perfectly in local development** (verified 2026-01-19):
- ✅ Successfully fetches from Wikipedia API
- ✅ Extracts 128 valid words in 132ms
- ✅ All 5 languages tested and working
- ✅ DNS resolution works
- ✅ HTTPS connectivity works

**If Wikipedia doesn't work on your production server**, the issue is server-specific networking or configuration, not the application code.

---

## Local Verification Results

### Test Results (Local Machine)
```
✓ DNS Resolution: Successfully resolved api.wikimedia.org (185.15.59.224)
✓ HTTPS Connectivity: Connected to Wikipedia API (344ms)
✓ Wikipedia Flow: Extracted 128 valid words in 132ms
  Top words: STIDHAM, REALITY, ENGLISH, KINGDOM, DENMARK

⚠ Warnings (non-blocking):
  - Redis not configured (caching disabled, but Wikipedia works)
  - Supabase keys missing (database storage disabled, but API works)
```

### Performance Metrics (All Languages)
| Language | API Time | Words Found | Status |
|----------|----------|-------------|--------|
| English  | 3.7s     | 128         | ✅     |
| Hebrew   | 4.6s     | 50          | ✅     |
| Japanese | 3.2s     | 17          | ✅     |
| Swedish  | 3.7s     | 127         | ✅     |
| Spanish  | 4.5s     | 122         | ✅     |

**Average Response Time:** 3.9s
**Success Rate:** 100%

---

## Common Production Server Issues

### Issue 1: Firewall Blocking Outgoing HTTPS
**Symptom:** Timeouts, connection refused, or no response
**Cause:** Server firewall blocks outgoing connections to Wikipedia
**Solution:**
```bash
# Allow outgoing HTTPS to api.wikimedia.org
# For AWS Security Groups:
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# For iptables:
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# For ufw:
sudo ufw allow out 443/tcp
```

### Issue 2: DNS Resolution Failure
**Symptom:** "ENOTFOUND api.wikimedia.org"
**Cause:** Server cannot resolve Wikipedia domain
**Solution:**
```bash
# Test DNS resolution:
nslookup api.wikimedia.org

# If fails, check DNS configuration:
cat /etc/resolv.conf

# Add Google DNS if needed:
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
```

### Issue 3: SSL Certificate Issues
**Symptom:** "unable to verify the first certificate"
**Cause:** Missing or outdated CA certificates
**Solution:**
```bash
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install ca-certificates

# CentOS/RHEL:
sudo yum install ca-certificates

# Update certificates:
sudo update-ca-certificates
```

### Issue 4: Node.js Network Timeout
**Symptom:** Requests timeout after 10 seconds
**Cause:** Network is very slow or Wikipedia API is slow from server location
**Solution:**
```typescript
// Increase timeout in wikipediaWordFetcher.ts (already set to 10s)
// If needed, increase to 15s or 20s:
const data = await fetchWithRetry<WikipediaFeaturedContent>(url, 20000);
```

### Issue 5: Redis Hanging
**Symptom:** No response, hangs indefinitely
**Cause:** Redis connection blocking the Wikipedia fetch
**Solution:**
Already fixed! Redis operations have 2s timeout with Promise.race:
```typescript
await Promise.race([
  redis.get(cacheKey),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
]);
```

### Issue 6: Corporate Proxy/Network Policy
**Symptom:** 403 Forbidden or connection refused
**Cause:** Corporate network blocks external API calls
**Solution:**
```bash
# Set HTTP proxy if required:
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Or configure in Node.js:
process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
process.env.HTTPS_PROXY = 'http://proxy.company.com:8080';
```

---

## How to Diagnose on Production Server

### Step 1: Run the Diagnostic Script

**Upload and run on server:**
```bash
# Copy script to server
scp scripts/diagnose-server-wikipedia.sh user@your-server:/tmp/

# SSH to server
ssh user@your-server

# Run diagnostic
bash /tmp/diagnose-server-wikipedia.sh
```

This will test:
1. ✓ DNS Resolution
2. ✓ TCP Connectivity (port 443)
3. ✓ HTTPS Request
4. ✓ SSL Certificate
5. ✓ Full API Response

### Step 2: Check Application Logs

**Look for these log entries:**
```
[Wikipedia] Fetching featured content for en on 2026-01-19...
[Wikipedia] Fetched featured content for en in XXXms
```

**If you see:**
- No logs at all → Request not reaching server or auth failing
- "Redis cache check timeout" → Redis issue (non-blocking)
- "Error fetching featured content" → Network issue (check error details)

### Step 3: Test from Node.js REPL

**SSH to server and test directly:**
```bash
node
```

```javascript
const axios = require('axios');

axios.get('https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19', {
  headers: {
    'User-Agent': 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)'
  },
  timeout: 10000
})
.then(res => console.log('✓ Success:', res.status, res.data.tfa?.title))
.catch(err => console.log('✗ Failed:', err.message));
```

### Step 4: Check Vercel/Netlify/Platform Settings

**For Vercel:**
- Wikipedia API should work by default (serverless functions allow external calls)
- Check function timeout: Default is 10s (Hobby), 60s (Pro)
- Increase if needed: `export const maxDuration = 60;`

**For AWS Lambda:**
- Check VPC settings (if in VPC, needs NAT Gateway for internet access)
- Check timeout: Default is 3s, increase to 30s+
- Check IAM permissions (should allow network access)

**For Docker/Kubernetes:**
- Check network policies
- Ensure egress traffic to internet is allowed
- Check DNS configuration in pod/container

---

## Quick Fixes

### If Wikipedia API is Blocked Completely

**Option 1: Use Fallback Static Words** (Already Implemented)
```typescript
// Wikipedia will automatically fall back to static word lists
// No action needed - this is already built into the code
```

**Option 2: Use Alternative API**
```typescript
// Instead of Wikimedia API, use Wiktionary
const url = `https://en.wiktionary.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10`;
```

**Option 3: Pre-fetch Words via Cron**
```bash
# Run Wikipedia fetch from a worker with internet access
# Store results in database
# Main app reads from database instead of calling API
```

### If Only Some Languages Fail

**Some Wikipedia language editions don't have featured content every day:**
```typescript
// The code already handles this - falls back to random articles
// Check logs for: "No featured content for {language} on {date}"
```

---

## Testing Commands

### Run Full Test Suite
```bash
# Test all languages locally
npm run test:wikipedia en
npm run test:wikipedia he
npm run test:wikipedia ja
npm run test:wikipedia sv
npm run test:wikipedia es

# Run production verification
npm run test:wikipedia:production
```

### Manual curl Test
```bash
# Test Wikipedia API directly
curl -H "User-Agent: LexiClash/1.0" \
     "https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19"
```

---

## Expected Behavior

### Successful Wikipedia Flow
```
[Wikipedia] Fetching featured content for en on 2026-01-19...
[Wikipedia] Fetched featured content for en in 3789ms
[WikiPopulator] Extracted 128 raw candidates from featured content
[WikiPopulator] Ranked 128 valid candidates
[Wikipedia] Stored 128 word candidates for en
```

### With Redis Caching
```
[Wikipedia] Using cached featured content for en from 2026-01-19
```

### When Wikipedia Unavailable
```
[Wikipedia] No featured content for ja on 2026-01-19
[WikiPopulator] Wikipedia unavailable, using fallback for ja
[WikiPopulator] Fallback: Selected 40 words from static list
```

---

## Production Checklist

Before deploying, verify:

- [ ] Server can reach `api.wikimedia.org` (DNS resolution)
- [ ] Firewall allows outgoing HTTPS on port 443
- [ ] SSL certificates are up to date
- [ ] Node.js has network access (not sandboxed)
- [ ] Function timeout is at least 15 seconds
- [ ] Redis is optional (Wikipedia works without it)
- [ ] Supabase keys are optional for API testing (required for storage)
- [ ] Logs show Wikipedia fetch attempts
- [ ] Fallback to static words works if Wikipedia fails

---

## Next Steps

1. **Run diagnostic on production server:**
   ```bash
   bash scripts/diagnose-server-wikipedia.sh
   ```

2. **Check application logs** for Wikipedia-related errors

3. **Test from Node.js REPL** on server to isolate networking issues

4. **Apply fixes** based on diagnostic results (firewall, DNS, SSL, etc.)

5. **Verify fix** by running Wikipedia population from admin dashboard

6. **Monitor** logs after deployment to ensure ongoing success

---

## Support

If Wikipedia still doesn't work after following this guide:

1. Check diagnostic script output (all 5 tests)
2. Share application logs (search for `[Wikipedia]`)
3. Share server/platform details (AWS, Vercel, etc.)
4. Confirm if using VPC, firewall, or proxy

**Remember:** Wikipedia API works locally (verified), so the issue is server-side networking/configuration.
