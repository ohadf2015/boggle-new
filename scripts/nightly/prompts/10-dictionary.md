# Lane 10 — Dictionary improvement (proactive candidate generation)

Today: __TODAY__

You extend LexiClash's multilingual game dictionaries by generating high-quality
NEW candidate words. You do NOT touch the live validation set — you only add
candidate words to committed `.txt` files. The backend verify→promote→heal
pipeline (Wiktionary / Jisho / milog + offensive filter) is the gate before any
word reaches gameplay. Full design: `docs/2026-06-04-dictionary-extensive-improvement-spec.md`.

## Intelligence brief
__BRIEF__

## Recent learnings
__LEARNINGS__

## Player feedback
__FEEDBACK_SUMMARY__

## Task (bounded — finish within your time budget)
ultracode

1. Run the multi-agent workflow `dictionary-improvement` for the weakest-coverage
   languages. Pass args as an ACTUAL OBJECT (not a string):

   `Workflow({ name: "dictionary-improvement", args: { langs: ["ja", "sv", "es"], limit: 25 } })`

   It generates → dual-judges (two personas, both must agree ≥0.75) → appends
   survivors to `fe-next/backend/dictionary/candidates/<lang>.txt` and writes a report.

2. After it completes, VERIFY form-correctness of the touched candidate files and
   strip any line that violates the language charset (these are dropped at runtime
   anyway — keep the files clean):

   ```bash
   cd fe-next/backend/dictionary && python3 - <<'PY'
   import re
   rx={'en':r'^[a-z]+$','es':r'^[a-zñ]+$','sv':r'^[a-zåäö]+$','he':r'^[א-ת]+$','ja':r'^[ぁ-ゖー]+$'}
   for lang in ('ja','sv','es'):
       p=f'candidates/{lang}.txt'; r=re.compile(rx[lang]); out=[]
       for l in open(p,encoding='utf-8'):
           s=l.rstrip('\n')
           if not s.strip() or s.lstrip().startswith('#') or r.match(s.strip()): out.append(s)
       open(p,'w',encoding='utf-8').write('\n'.join(out)+'\n')
   print('cleaned')
   PY
   ```

## Hard limits
- ONLY edit `fe-next/backend/dictionary/candidates/*.txt` and files under `docs/`.
- Do NOT edit backend code, migrations, translations, or any validation set.
- These are CANDIDATES, not accepted words — never claim words are "added to the dictionary".

## Mandatory artifact
Write `docs/nightly/artifacts/lane-10-__TODAY__.md` first (then update it): languages
processed, candidates added per language, form violations cleaned, and a status line
(`shipped` | `partial` | `research-only` | `blocked`).

## Fallback (if the Workflow tool is unavailable)
Generate ~15 common, real words per weak language yourself, obeying the charset rules
above (ja hiragana-only, es a–z+ñ no accents, sv a–zåäö). Cross-check each is a real
standalone word, then append the verified ones to the candidate files. Same hard limits.
