---
status: shipped
attempted: fallback path (no named workflow found) — manual candidate generation for ja/sv/es
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt
---

## Summary

Named workflow `dictionary-improvement` not found in `~/.claude/workflows/`. Used fallback: manual candidate generation with dual charset verification.

## Candidates added

| Lang | Before | After | Net new |
|------|--------|-------|---------|
| ja   | 480    | 508   | +28     |
| sv   | 507    | 528   | +21     |
| es   | 679    | 698   | +19     |

**Total: +68 candidates** across ja/sv/es (all lines including comments/blanks; ~26/19/17 actual words).

## New words by language

### ja (hiragana-only)
Direction/location: みち、はし、きた、みなみ、ひがし、にし、まえ、こえ
Nature/material: てら、いわ、ふね、こめ、むぎ
Objects: ふく、はこ、かね、いと、かがみ、やね、とびら
Abstract: むら、くに、ひかり、うた、おと、きもち

### sv (a-zåäö)
Colors: grå
Family: son、dotter
Social: vän、fiende、kärlek、fred
Food: te、salt、peppar、ost
Animals: djur
Culture: musik、dans、sång、konst、sport、spela
Travel: resa

### es (a-zñ)
People: amigo、vecino、maestro、medico、hombre、hija、hermana
Actions: ganar
Places: isla、escuela
Seasons: verano、invierno、primavera
Society: policia、rey、reina、verdura

## Charset cleanup
All 3 files: 0 violations rejected. Every new word matches its charset regex.

## Next steps
- Register `dictionary-improvement` named workflow so future lanes can run the full dual-judge pipeline
- Consider adding `en` and `he` candidates next run (lower current coverage vs ja/sv/es)
- Wiktionary/Jisho verify→promote pipeline is backend-only — these remain candidates until promoted
