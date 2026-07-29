#!/bin/bash

# Wikipedia Server Diagnostics
# Run this script on the production server to diagnose Wikipedia connectivity issues

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       Wikipedia API Server Diagnostics                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: DNS Resolution
echo "[Test 1/5] DNS Resolution..."
if nslookup api.wikimedia.org > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS resolution successful${NC}"
    IP=$(nslookup api.wikimedia.org | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    echo "  IP: $IP"
else
    echo -e "${RED}✗ DNS resolution failed${NC}"
    echo "  This means the server cannot resolve api.wikimedia.org"
    echo "  Check /etc/resolv.conf for DNS configuration"
fi
echo ""

# Test 2: TCP Connectivity (Port 443)
echo "[Test 2/5] TCP Connectivity (HTTPS Port 443)..."
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/api.wikimedia.org/443" 2>/dev/null; then
    echo -e "${GREEN}✓ TCP connection to port 443 successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to port 443${NC}"
    echo "  This means the firewall is blocking HTTPS traffic to Wikipedia"
    echo "  Check firewall rules and security groups"
fi
echo ""

# Test 3: HTTPS Request with curl
echo "[Test 3/5] HTTPS Request with curl..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)" \
    --max-time 10 \
    "https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19" 2>&1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ HTTPS request successful (HTTP 200)${NC}"

    # Get response time
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" \
        -H "User-Agent: LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)" \
        --max-time 10 \
        "https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19")
    echo "  Response time: ${RESPONSE_TIME}s"
elif [ -z "$HTTP_CODE" ]; then
    echo -e "${RED}✗ curl command failed${NC}"
    echo "  curl might not be installed or network is completely blocked"
else
    echo -e "${YELLOW}⚠ Received HTTP $HTTP_CODE${NC}"
    echo "  Expected 200, got $HTTP_CODE"
fi
echo ""

# Test 4: SSL Certificate
echo "[Test 4/5] SSL Certificate Verification..."
if openssl s_client -connect api.wikimedia.org:443 -servername api.wikimedia.org < /dev/null 2>&1 | grep -q "Verify return code: 0"; then
    echo -e "${GREEN}✓ SSL certificate is valid${NC}"
else
    echo -e "${YELLOW}⚠ SSL certificate verification failed${NC}"
    echo "  This might be due to missing CA certificates on the server"
    echo "  Try: apt-get install ca-certificates (Ubuntu/Debian)"
    echo "  Or: yum install ca-certificates (CentOS/RHEL)"
fi
echo ""

# Test 5: Full API Response
echo "[Test 5/5] Full API Response Test..."
RESPONSE=$(curl -s \
    -H "User-Agent: LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)" \
    -H "Accept: application/json" \
    --max-time 10 \
    "https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19")

if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
    # Check if response is valid JSON
    if echo "$RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API returned valid JSON${NC}"

        # Extract featured article title (if available)
        TITLE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('tfa', {}).get('title', 'N/A'))" 2>/dev/null)
        if [ "$TITLE" != "N/A" ] && [ -n "$TITLE" ]; then
            echo "  Featured Article: $TITLE"
        fi

        # Count most read articles
        MOSTREAD_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('mostread', {}).get('articles', [])))" 2>/dev/null)
        if [ -n "$MOSTREAD_COUNT" ]; then
            echo "  Most Read Articles: $MOSTREAD_COUNT"
        fi
    else
        echo -e "${YELLOW}⚠ API returned non-JSON response${NC}"
        echo "  First 200 chars of response:"
        echo "$RESPONSE" | head -c 200
    fi
else
    echo -e "${RED}✗ API request failed${NC}"
    echo "  Check the output above for specific errors"
fi
echo ""

# Summary
echo "══════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "If all tests pass:"
echo "  Wikipedia API should work on this server."
echo "  If Wikipedia flow still fails, check Node.js application logs."
echo ""
echo "If DNS fails:"
echo "  The server cannot resolve api.wikimedia.org"
echo "  Action: Check DNS configuration in /etc/resolv.conf"
echo ""
echo "If TCP connectivity fails:"
echo "  Firewall is blocking outgoing HTTPS (port 443)"
echo "  Action: Update firewall rules or security groups"
echo ""
echo "If HTTPS request fails:"
echo "  Network policy might be blocking Wikipedia specifically"
echo "  Action: Check with network administrator"
echo ""
echo "If SSL fails:"
echo "  Missing or outdated CA certificates"
echo "  Action: Install/update ca-certificates package"
echo ""
echo "══════════════════════════════════════════════════════════"
echo "Run this command on your production server to diagnose Wikipedia issues."
echo "══════════════════════════════════════════════════════════"
