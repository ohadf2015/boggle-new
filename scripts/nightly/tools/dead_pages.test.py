#!/usr/bin/env python3
"""TDD for dead_pages.select_dead_pages — the pure noindex-candidate selector.

Run: python3 scripts/nightly/tools/dead_pages.test.py
No external deps (stdlib unittest only) so it runs without the google libs.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dead_pages import select_dead_pages  # noqa: E402


def row(page, clicks, impressions):
    return {"page": page, "clicks": clicks, "impressions": impressions}


HOST = "https://www.lexiclash.live"
ALLOW = ["/words/starting-with/", "/words/3-letter-words"]
BAN = ["/anagram", "/multiplayer", "/daily"]


class SelectDeadPages(unittest.TestCase):
    def test_selects_zero_traffic_allowed_page(self):
        rows = [row(f"{HOST}/en/words/starting-with/x", 0, 1)]
        out = select_dead_pages(rows, ALLOW, BAN)
        self.assertEqual([c["page"] for c in out], [f"{HOST}/en/words/starting-with/x"])

    def test_excludes_pages_with_clicks(self):
        rows = [row(f"{HOST}/en/words/starting-with/x", 2, 50)]
        self.assertEqual(select_dead_pages(rows, ALLOW, BAN), [])

    def test_excludes_pages_over_impression_floor(self):
        rows = [row(f"{HOST}/en/words/starting-with/x", 0, 99)]
        self.assertEqual(select_dead_pages(rows, ALLOW, BAN, max_impressions=2), [])

    def test_excludes_banned_route_even_if_dead(self):
        # /anagram is dead weight but in the ban list (founder decision deferred)
        rows = [row(f"{HOST}/en/anagram/abcr", 0, 1)]
        self.assertEqual(select_dead_pages(rows, ALLOW, BAN), [])

    def test_excludes_pages_not_in_allowlist(self):
        # a core informational page must never be auto-noindexed
        rows = [row(f"{HOST}/en/about", 0, 0)]
        self.assertEqual(select_dead_pages(rows, ALLOW, BAN), [])

    def test_ban_is_locale_aware(self):
        # /he/anagram canonicalizes to /anagram → still banned
        rows = [row(f"{HOST}/he/anagram/abcr", 0, 1)]
        self.assertEqual(select_dead_pages(rows, ALLOW, BAN), [])

    def test_allow_is_locale_aware(self):
        rows = [row(f"{HOST}/es/words/starting-with/f", 0, 1)]
        self.assertEqual(len(select_dead_pages(rows, ALLOW, BAN)), 1)

    def test_caps_results(self):
        rows = [row(f"{HOST}/en/words/starting-with/{c}", 0, 1) for c in "abcdefghij"]
        self.assertEqual(len(select_dead_pages(rows, ALLOW, BAN, cap=5)), 5)

    def test_sorted_by_impressions_then_url(self):
        rows = [
            row(f"{HOST}/en/words/starting-with/b", 0, 2),
            row(f"{HOST}/en/words/starting-with/a", 0, 1),
        ]
        out = select_dead_pages(rows, ALLOW, BAN)
        self.assertEqual([c["page"].split("/")[-1] for c in out], ["a", "b"])

    def test_handles_n_letter_words_allow(self):
        rows = [row(f"{HOST}/en/words/3-letter-words", 0, 1)]
        self.assertEqual(len(select_dead_pages(rows, ALLOW, BAN)), 1)

    def test_require_locale_drops_already_noindexed_nonindexed_locale(self):
        # /words/* families are EN-only-indexed; an /es page is already index:false,
        # so noindexing it is a no-op → must NOT be surfaced when require_locale='en'.
        rows = [
            row(f"{HOST}/es/words/starting-with/f", 0, 1),
            row(f"{HOST}/en/words/starting-with/f", 0, 1),
        ]
        out = select_dead_pages(rows, ALLOW, BAN, require_locale="en")
        self.assertEqual([c["page"] for c in out], [f"{HOST}/en/words/starting-with/f"])

    def test_require_locale_none_keeps_all(self):
        rows = [row(f"{HOST}/es/words/starting-with/f", 0, 1)]
        self.assertEqual(len(select_dead_pages(rows, ALLOW, BAN, require_locale=None)), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
