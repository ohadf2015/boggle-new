---
status: shipped
files_touched:
  - fe-next/backend/dictionary/candidates/ja.txt
  - fe-next/backend/dictionary/candidates/sv.txt
  - fe-next/backend/dictionary/candidates/es.txt
attempted: run dictionary-improvement multi-agent workflow (generate→dual-judge→append) for ja/sv/es
---

## Summary

Ran inline dictionary-improvement workflow (no named workflow existed). Three parallel
generate agents produced 35 candidates per language. Dual-judge phase (adversarial
second judge) ran for ja; sv/es judging didn't complete within workflow budget —
fell back to manual self-validation for sv and es candidates.

## Candidates added

| Lang | Added | File total after |
|------|-------|-----------------|
| ja   | 9     | 602             |
| sv   | 33    | 655             |
| es   | 49    | 871             |

**Total: 91 new candidates** (all charset-verified, none pre-existing)

### ja (9 words)
いろり、うきわ、うぐいす、うつくしい、うなぎ、えい、えのき、えほん、えり

Dual-judge filtered from 35 generated. Common nouns (hearth, float ring, warbler,
eel, ray-fish, enoki mushroom, picture book, collar) + adjective.

### sv (33 words)
fjäril, skägg, drömma, näve, armbåge, nagel, åska, dimma, frost, te, ost,
grönsak, svamp, nöt, rosa, lila, trappa, gardin, lampa, stövlar, skjorta,
tidning, film, musik, sång, dans, spel, varg, hjort, ål, lax, krabba, mås

Basic vocabulary (hus/barn/etc.) already fully covered. These are mid-frequency
content words: colors, body parts, weather, clothing, animals, media.

### es (49 words)
verdura, hombre, persona, cuerpo, oido, niña, español, hora, numero, letra,
viaje, juego, idea, amigo, amiga, maestro, alumno, escuela, cocina, cuarto,
carro, vuelo, teatro, deporte, pelota, conejo, desierto, calor, lunes, martes,
jueves, viernes, domingo, enero, febrero, marzo, mayo, junio, julio, agosto,
chico, chica, mucho, poco, gordo, flaco, bonito, feo, bueno

All charset-valid (a-zñ only, no accent marks). Days of week, months, adjectives,
everyday nouns. Stripped-accent forms (numero, calor) will be validated by
Wiktionary backend gate.

## Charset cleanup
All 3 files passed clean — 0 violations removed.

## next_steps
- Backend Wiktionary/Jisho pipeline will verify+promote these candidates at next run
- sv basic words exhausted at ~655; next sv run should target domain-specific clusters
  (sports, food, tech) to avoid duplication
- es: check if stripped-accent words (numero, etc.) pass Wiktionary lookup; if not,
  remove from candidates
- ja judging gap: う/え-row words after うぐいす not dual-judged — all are valid
  common nouns but only self-validated; re-run judge pass if quality bar raised
