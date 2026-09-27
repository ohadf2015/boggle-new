#!/usr/bin/env python3
"""
PostHog monitoring for Poki platform traffic.
Checks for platform = 'poki' sessions and reports daily stats.
Usage: python3 check-poki-traffic.py

Requires:
  POSTHOG_PROJECT_API_KEY - Personal API key from https://eu.posthog.com/settings/user/api_keys
  POSTHOG_PROJECT_ID - Project ID (numeric, from https://eu.posthog.com/settings/project)
"""
import os, urllib.request, json, sys
from datetime import datetime, timedelta, timezone

API_KEY = os.environ.get('POSTHOG_PROJECT_API_KEY', '')
PROJECT_ID = os.environ.get('POSTHOG_PROJECT_ID', '')
HOST = os.environ.get('POSTHOG_HOST', 'https://eu.i.posthog.com')

if not API_KEY or not PROJECT_ID:
    print("SKIP - POSTHOG_PROJECT_API_KEY or POSTHOG_PROJECT_ID not set")
    sys.exit(0)

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

# Query events with platform = poki in last 24h
yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
today = datetime.now(timezone.utc).isoformat()

query = {
    "events": [{"id": "$pageview", "type": "events"}],
    "properties": {
        "type": "AND",
        "values": [
            {
                "key": "platform",
                "value": "poki",
                "operator": "exact",
                "type": "person"
            }
        ]
    },
    "date_from": yesterday,
    "date_to": today,
}

try:
    req = urllib.request.Request(
        f'{HOST}/api/projects/{PROJECT_ID}/events/',
        data=json.dumps(query).encode(),
        headers=headers,
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        events = data.get('results', [])
        unique_users = len(set(e.get('distinct_id', '') for e in events))
        total_events = len(events)

        print(f"Poki traffic check — last 24h")
        print(f"  Events from poki platform: {total_events}")
        print(f"  Unique poki users: {unique_users}")
        if total_events > 0:
            print(f"  ✅ Poki distribution is LIVE")
            print(f"  Latest event: {events[0].get('timestamp', 'unknown')}")
        else:
            print(f"  ⏸️  No poki traffic yet — still dormant or not live")

except Exception as e:
    print(f"ERROR querying PostHog: {e}")