#!/bin/bash
# LexiClash SEO Troubleshooting Script
# Run this to diagnose indexing issues

set -e

DOMAIN="https://www.lexiclash.live"
YELLOW='\033[1;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${YELLOW}LexiClash SEO Troubleshooting${NC}"
echo "======================================"
echo ""

# 1. Test robots.txt
echo -e "${YELLOW}[1] Testing robots.txt...${NC}"
echo "curl -s $DOMAIN/robots.txt | head -20"
ROBOTS=$(curl -s "$DOMAIN/robots.txt" | head -20)
if echo "$ROBOTS" | grep -q "Disallow: /\$"; then
  echo -e "${RED}❌ CRITICAL: robots.txt blocks ALL crawlers${NC}"
  echo "$ROBOTS"
elif echo "$ROBOTS" | grep -q "Disallow: /" && ! echo "$ROBOTS" | grep -q "Allow: /"; then
  echo -e "${RED}❌ CRITICAL: robots.txt globally disallows (no Allow directives)${NC}"
  echo "$ROBOTS"
else
  echo -e "${GREEN}✅ robots.txt allows crawlers${NC}"
fi
echo ""

# 2. Test X-Robots-Tag header
echo -e "${YELLOW}[2] Checking X-Robots-Tag header...${NC}"
echo "curl -I $DOMAIN/en"
HEADERS=$(curl -sI "$DOMAIN/en")
if echo "$HEADERS" | grep -i "x-robots-tag.*noindex"; then
  echo -e "${RED}❌ CRITICAL: X-Robots-Tag header has 'noindex'${NC}"
  echo "$HEADERS" | grep -i "x-robots-tag"
elif echo "$HEADERS" | grep -i "x-robots-tag"; then
  echo -e "${RED}❌ WARNING: X-Robots-Tag header present (should not be in production)${NC}"
  echo "$HEADERS" | grep -i "x-robots-tag"
else
  echo -e "${GREEN}✅ No noindex X-Robots-Tag header${NC}"
fi
echo ""

# 3. Test HTTP status code
echo -e "${YELLOW}[3] Checking HTTP status codes...${NC}"
echo "curl -o /dev/null -s -w '%{http_code}' $DOMAIN/en"
STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$DOMAIN/en")
if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Home page returns HTTP 200${NC}"
elif [ "$STATUS" = "404" ] || [ "$STATUS" = "500" ] || [ "$STATUS" = "503" ]; then
  echo -e "${RED}❌ CRITICAL: Home page returns HTTP $STATUS${NC}"
else
  echo -e "${YELLOW}⚠️  Home page returns HTTP $STATUS${NC}"
fi
echo ""

# 4. Test sitemap.xml
echo -e "${YELLOW}[4] Testing sitemap.xml...${NC}"
echo "curl -s $DOMAIN/sitemap.xml | head -30"
SITEMAP=$(curl -s "$DOMAIN/sitemap.xml" | head -30)
if echo "$SITEMAP" | grep -q "<?xml"; then
  echo -e "${GREEN}✅ sitemap.xml is valid XML${NC}"
  URLS=$(echo "$SITEMAP" | grep -c "<url>")
  echo "   Found $URLS URL entries in first section"
else
  echo -e "${RED}❌ sitemap.xml is not valid XML or not found${NC}"
  echo "$SITEMAP"
fi
echo ""

# 5. Test meta tags
echo -e "${YELLOW}[5] Checking meta tags...${NC}"
echo "curl -s $DOMAIN/en | grep -E '<title>|<meta name=\"description\"'"
PAGE=$(curl -s "$DOMAIN/en")
TITLE=$(echo "$PAGE" | grep -oP '<title>\K[^<]*' | head -1)
DESC=$(echo "$PAGE" | grep -oP 'name="description" content="\K[^"]*' | head -1)

if [ -n "$TITLE" ]; then
  echo -e "${GREEN}✅ Title tag: $TITLE${NC}"
else
  echo -e "${RED}❌ No title tag found${NC}"
fi

if [ -n "$DESC" ]; then
  echo -e "${GREEN}✅ Meta description found (${#DESC} chars)${NC}"
else
  echo -e "${RED}❌ No meta description${NC}"
fi
echo ""

# 6. Test Open Graph tags
echo -e "${YELLOW}[6] Checking Open Graph tags...${NC}"
OG_TITLE=$(echo "$PAGE" | grep -oP 'property="og:title" content="\K[^"]*' | head -1)
OG_IMAGE=$(echo "$PAGE" | grep -oP 'property="og:image" content="\K[^"]*' | head -1)
OG_DESC=$(echo "$PAGE" | grep -oP 'property="og:description" content="\K[^"]*' | head -1)

if [ -n "$OG_TITLE" ]; then
  echo -e "${GREEN}✅ og:title: $OG_TITLE${NC}"
else
  echo -e "${YELLOW}⚠️  Missing og:title${NC}"
fi

if [ -n "$OG_IMAGE" ]; then
  echo -e "${GREEN}✅ og:image: $OG_IMAGE${NC}"
else
  echo -e "${YELLOW}⚠️  Missing og:image${NC}"
fi
echo ""

# 7. Test JSON-LD structured data
echo -e "${YELLOW}[7] Checking JSON-LD structured data...${NC}"
if echo "$PAGE" | grep -q '"@context".*schema.org'; then
  SCHEMAS=$(echo "$PAGE" | grep -o '"@type"' | wc -l)
  echo -e "${GREEN}✅ Found $SCHEMAS JSON-LD schemas${NC}"
else
  echo -e "${YELLOW}⚠️  No JSON-LD structured data found${NC}"
fi
echo ""

# 8. Test canonical URL
echo -e "${YELLOW}[8] Checking canonical URL...${NC}"
CANONICAL=$(echo "$PAGE" | grep -oP 'rel="canonical" href="\K[^"]*' | head -1)
if [ -n "$CANONICAL" ]; then
  echo -e "${GREEN}✅ Canonical: $CANONICAL${NC}"
else
  echo -e "${YELLOW}⚠️  No canonical URL${NC}"
fi
echo ""

# 9. Test hreflang
echo -e "${YELLOW}[9] Checking hreflang tags...${NC}"
HREFLANGS=$(echo "$PAGE" | grep -c 'hreflang')
if [ "$HREFLANGS" -gt 0 ]; then
  echo -e "${GREEN}✅ Found $HREFLANGS hreflang tags${NC}"
else
  echo -e "${YELLOW}⚠️  No hreflang tags${NC}"
fi
echo ""

# 10. Test robots meta tag
echo -e "${YELLOW}[10] Checking robots meta tag...${NC}"
ROBOTS_META=$(echo "$PAGE" | grep -oP 'name="robots" content="\K[^"]*' | head -1)
if [ -n "$ROBOTS_META" ]; then
  if echo "$ROBOTS_META" | grep -q "noindex"; then
    echo -e "${RED}❌ Meta robots tag has 'noindex': $ROBOTS_META${NC}"
  else
    echo -e "${GREEN}✅ Meta robots: $ROBOTS_META${NC}"
  fi
else
  echo -e "${GREEN}✅ No restrictive robots meta tag${NC}"
fi
echo ""

# 11. Test Security Headers
echo -e "${YELLOW}[11] Checking security headers...${NC}"
HEADERS=$(curl -sI "$DOMAIN/en")
CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | cut -d: -f2-)
if [ -n "$CSP" ]; then
  echo -e "${GREEN}✅ CSP header present${NC}"
else
  echo -e "${YELLOW}⚠️  No CSP header${NC}"
fi
echo ""

# Summary
echo "======================================"
echo -e "${YELLOW}Summary:${NC}"
echo "1. Check NEXT_PUBLIC_IS_PREVIEW env var (should be empty or 'false')"
echo "2. Check RAILWAY_ENVIRONMENT_NAME env var (should not start with 'pr-')"
echo "3. Verify HTTP status is 200 for all pages"
echo "4. Submit sitemap to Google Search Console"
echo "5. Use Google Search Console URL Inspector to request re-indexing"
echo ""
echo "Run this command to check environment:"
echo "  env | grep -E 'NEXT_PUBLIC_IS_PREVIEW|RAILWAY_ENVIRONMENT_NAME|NODE_ENV'"
echo ""
