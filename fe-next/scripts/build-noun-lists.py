#!/usr/bin/env python3
"""
Build noun-only word lists for all LexiClash languages from Wiktionary.

Fetches nouns (+ noun forms, excluding proper nouns) from English Wiktionary's
categorized data. Outputs one file per language: {lang}_nouns.txt

These lists are used to filter word hunt boards so players only see
recognizable nouns instead of obscure verb conjugations.

Usage: python3 scripts/build-noun-lists.py [--lang he,en,sv,ja,es]
"""

import urllib.request
import urllib.parse
import json
import time
import os
import sys
import argparse

WIKTIONARY_API = "https://en.wiktionary.org/w/api.php"
USER_AGENT = "LexiClash-DictBuilder/1.0 (word game noun filter)"

# ── Language configs ──────────────────────────────────────────────────
LANG_CONFIGS = {
    'en': {
        'name': 'English',
        'categories': [
            "Category:English nouns",
            "Category:English noun forms",
        ],
        'is_valid_char': lambda c: c.isascii() and c.isalpha(),
        'normalize': lambda w: w.lower(),
        'min_length': 2,
    },
    'he': {
        'name': 'Hebrew',
        'categories': [
            "Category:Hebrew nouns",
            "Category:Hebrew noun forms",
            "Category:Hebrew collective nouns",
            "Category:Hebrew countable nouns",
            "Category:Hebrew diminutive nouns",
            "Category:Hebrew pluralia tantum",
            "Category:Hebrew singularia tantum",
            "Category:Hebrew uncountable nouns",
            "Category:Hebrew verbal nouns",
        ],
        'is_valid_char': lambda c: '\u05D0' <= c <= '\u05EA',
        'normalize': lambda w: w.translate(str.maketrans('ץךםןף', 'צכמנפ')),
        'min_length': 2,
    },
    'sv': {
        'name': 'Swedish',
        'categories': [
            "Category:Swedish nouns",
            "Category:Swedish noun forms",
        ],
        'is_valid_char': lambda c: c.isalpha() and (c.isascii() or c in 'åäöÅÄÖ'),
        'normalize': lambda w: w.lower(),
        'min_length': 2,
    },
    'ja': {
        'name': 'Japanese',
        'categories': [
            "Category:Japanese nouns",
            "Category:Japanese noun forms",
        ],
        'is_valid_char': lambda c: (
            '\u3040' <= c <= '\u309F' or  # Hiragana
            '\u30A0' <= c <= '\u30FF' or  # Katakana
            '\u4E00' <= c <= '\u9FFF' or  # CJK
            '\u3400' <= c <= '\u4DBF'     # CJK Extension A
        ),
        'normalize': lambda w: w,
        'min_length': 1,
    },
    'es': {
        'name': 'Spanish',
        'categories': [
            "Category:Spanish nouns",
            "Category:Spanish noun forms",
        ],
        'is_valid_char': lambda c: c.isalpha() and (c.isascii() or c in 'áéíóúüñÁÉÍÓÚÜÑ'),
        'normalize': lambda w: w.lower(),
        'min_length': 2,
    },
}


def is_valid_word(word: str, config: dict) -> bool:
    if len(word) < config['min_length']:
        return False
    return all(config['is_valid_char'](c) for c in word)


def fetch_category_members(category: str, config: dict) -> set[str]:
    """Fetch all page titles with exponential backoff on rate limits."""
    words = set()
    cmcontinue = None
    page_count = 0
    consecutive_errors = 0

    while True:
        params = {
            'action': 'query',
            'list': 'categorymembers',
            'cmtitle': category,
            'cmtype': 'page',
            'cmlimit': '500',
            'format': 'json',
        }
        if cmcontinue:
            params['cmcontinue'] = cmcontinue

        url = WIKTIONARY_API + '?' + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})

        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            consecutive_errors = 0

            members = data.get('query', {}).get('categorymembers', [])
            for m in members:
                title = m['title']
                if is_valid_word(title, config):
                    words.add(config['normalize'](title))

            page_count += 1

            if 'continue' in data:
                cmcontinue = data['continue'].get('cmcontinue')
                time.sleep(0.5)
                if page_count % 50 == 0:
                    print(f"    ... page {page_count}, {len(words)} words so far")
            else:
                break

        except Exception as e:
            consecutive_errors += 1
            if consecutive_errors > 8:
                print(f"    Stopping after {consecutive_errors} errors at page {page_count} ({len(words)} words collected)")
                break
            wait = min(60, 2 ** consecutive_errors)
            print(f"    Rate limited at page {page_count}, waiting {wait}s...")
            time.sleep(wait)

    return words


def build_nouns_for_language(lang: str, config: dict, output_dir: str) -> int:
    print(f"\n{'='*60}")
    print(f"  {config['name']} ({lang})")
    print(f"{'='*60}")

    all_nouns = set()

    for cat in config['categories']:
        print(f"  Fetching: {cat}")
        words = fetch_category_members(cat, config)
        print(f"    → {len(words)} valid words")
        all_nouns.update(words)
        # Pause between categories to avoid rate limits
        time.sleep(2)

    print(f"  Total unique nouns: {len(all_nouns)}")

    output_path = os.path.join(output_dir, f'{lang}_nouns.txt')
    sorted_nouns = sorted(all_nouns)

    with open(output_path, 'w', encoding='utf-8') as f:
        for noun in sorted_nouns:
            f.write(noun + '\n')

    print(f"  Written to: {output_path}")
    return len(all_nouns)


def main():
    parser = argparse.ArgumentParser(description='Build noun lists from Wiktionary')
    parser.add_argument('--lang', type=str, default='he,en,sv,ja,es',
                        help='Comma-separated language codes (default: all)')
    args = parser.parse_args()

    langs = [l.strip() for l in args.lang.split(',')]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', 'backend')

    print("LexiClash Noun List Builder")
    print(f"Languages: {', '.join(langs)}")

    totals = {}
    for lang in langs:
        if lang not in LANG_CONFIGS:
            print(f"Unknown language: {lang}, skipping")
            continue
        totals[lang] = build_nouns_for_language(lang, LANG_CONFIGS[lang], output_dir)

    print(f"\n{'='*60}")
    print("  Summary")
    print(f"{'='*60}")
    for lang, count in totals.items():
        print(f"  {LANG_CONFIGS[lang]['name']}: {count:,} nouns")


if __name__ == '__main__':
    main()
