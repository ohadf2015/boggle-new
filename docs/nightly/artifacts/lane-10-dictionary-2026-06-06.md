status: shipped
attempted: Generate ~25 new candidate words each for ja/sv/es (Workflow tool unavailable — fallback LLM generation), clean charset violations, append to candidate files

## Results

| lang | candidates added | charset violations | final file size |
|------|------------------|--------------------|-----------------|
| ja   | 25               | 0                  | 237 lines       |
| sv   | 25               | 0                  | 222 lines       |
| es   | 25               | 0                  | 195 lines       |

### Word categories this batch
- **ja**: everyday nouns (nature, household, body) — すいか、せかい、そら、たいよう、ちきゅう、つき、てがみ、とり、なまえ、にわ、ねこ、のはら、はな、ひかり、ふゆ、へや、ほし、まち、みず、むし、もり、やま、ゆき、よる、りんご
- **sv**: common Swedish nouns (nature, food, animals) — sol、måne、stjärna、himmel、hav、berg、skog、blomma、fågel、fisk、hund、katt、äpple、bröd、mjölk、vatten、eld、snö、regn、vind、sten、jord、gräs、träd、is
- **es**: accent-free common words (charset: a-zñ only, no á/é/í/ó/ú) — sol、mar、amor、pan、flor、voz、luz、noche、gato、perro、casa、mesa、silla、libro、agua、rio、monte、lago、bosque、nube、lluvia、viento、fuego、verde、azul

## Charset cleanup
Ran regex validator on all three files post-append — zero violations in any language.

## files_touched
- fe-next/backend/dictionary/candidates/ja.txt (+26 lines incl comment header)
- fe-next/backend/dictionary/candidates/sv.txt (+26 lines incl comment header)
- fe-next/backend/dictionary/candidates/es.txt (+26 lines incl comment header)

## next_steps
- es: many high-frequency words carry accents (árbol, río, año) — either relax charset regex to include á/é/í/ó/ú in es candidates, or continue generating the accent-free subset; the verify pipeline will handle final validation
- ja: next batch could focus on verbs in te-form (hiragana only) and adjectives
- sv: next batch could cover verbs in infinitive form (a-zåäö)
- he: still weakest coverage (116 lines) — worth a dedicated run seeding from Wiktionary frequency lists
