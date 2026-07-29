export interface LetterInfo {
  intro: string;
  strategy: string;
  funFact: string;
}

/**
 * Genuinely unique educational content for each letter of the alphabet.
 * Keys are lowercase single characters matching the `letter` variable from parseLetter().
 * Each entry covers: (a) frequency/rarity, (b) etymology or linguistic pattern, (c) word-game strategy.
 */
export const LETTER_CONTENT: Record<string, LetterInfo> = {
  a: {
    intro:
      'A is the third most common starting letter in English, accounting for roughly 8% of all dictionary entries. Words beginning with A often trace to Latin prefixes like "ad-" (toward) and "anti-" (against), or Greek roots like "aero-" and "agro-". In word games, A-words are your bread and butter — abundant and varied across all word lengths.',
    strategy:
      'Short A-words like AA, AB, and AX are powerful 2-letter plays. Look for the prefix "anti-" to unlock bonus-length words. Because A-words are so common, mastering the rare 7+ letter ones — ABALONE, ABDOMEN — separates good players from great ones.',
    funFact:
      'The letter A is one of five vowels but appears in more word-starting positions than any other vowel. Ancient Phoenician called it "aleph," meaning ox — the symbol was originally a sideways ox head.',
  },
  b: {
    intro:
      'B-words tend to be concrete and punchy — think BLAST, BRAVE, BRIGHT. The letter B appears in about 2% of English text but starts roughly 4% of dictionary words. Many B-words arrive via Germanic roots, giving them a solid, physical feel that reflects the sounds of Old English.',
    strategy:
      'Look for B-words with productive endings like -IBLE (VISIBLE → INVISIBLE), -TION, and -NESS. BLANK and BLEND are high-frequency game words that appear across almost every grid. Double-consonant openings like BL-, BR-, and BL- are especially rich territory.',
    funFact:
      'B was once considered interchangeable with P in many early writing systems. In Spanish, B and V are pronounced identically, which is why the old joke "it\'s all the same" persists — a holdover from Latin where both sounds merged.',
  },
  c: {
    intro:
      'C is the fourth most common starting letter in English, covering about 9% of dictionary words. It is uniquely dual-natured: before A, O, and U it sounds like K (CAT, COP, CUT), and before E and I it sounds like S (CENT, CITY). This split origin reflects both Germanic and Latin branches of English.',
    strategy:
      'The CH- cluster opens a rich sub-list: CHAIR, CHARM, CHEST. C-words ending in -TION and -ENCE are high-value targets for longer words. In competitive play, knowing your short C-words (COT, COP, CUB) for tight boards gives you consistent scoring opportunities.',
    funFact:
      'The letter C was borrowed from the Etruscans, who used it for the G sound. Romans repurposed it for K and S sounds. That\'s why C has no single consistent sound — it carries the memory of at least three different phonetic traditions.',
  },
  d: {
    intro:
      'D is a workhorse letter that starts about 4% of English words. Many come from the Old English prefix "de-" (away, down) and Latin "dis-" (apart), making D-words often signal separation or reduction: DETACH, DIVIDE, DISMISS. D is also prominent in Germanic body-part words like DIGIT and DIG.',
    strategy:
      'DR- and DW- clusters are underused by casual players — words like DRAB, DRAW, DWELL reward grid hunters who scan diagonals. Short D-words (DO, DIM, DOT) provide reliable filler, while 7-letter D-words (DISTANT, DISTORT) are rare but high-scoring game-changers.',
    funFact:
      'In music notation, D is one of the seven natural notes. In Roman numerals, D represents 500. The letter descends from the Phoenician "daleth," meaning door — you can still see the door shape in its rounded form.',
  },
  e: {
    intro:
      'E is the single most frequent letter in English overall, but it starts fewer words than you might expect — around 3% of dictionary entries. Most E-words carry prefixes like "ex-" (out of), "en-" (into), and "epi-" (upon), giving them a directional or intensifying quality: EXPORT, ENGAGE, EPICENTER.',
    strategy:
      'Short E-words are rare and thus valuable: EA (British waterway), EM (typesetting unit), EX. In longer play, EX- prefix words multiply your options: EXACT, EXERT, EXPEL. Because E ends so many words, spotting E-starts on the grid before others is a skill that pays off.',
    funFact:
      'E is so dominant in English text that a famous novel — "Gadsby" by Ernest Vincent Wright (1939) — was written entirely without it. The constraint is called a "lipogram." Over 310 pages, Wright avoided the most common letter in the language.',
  },
  f: {
    intro:
      'F starts about 3% of English words, with a strong showing in Germanic root words that describe flow, fire, and fields: FLOOD, FLAME, FIELD. The Old English prefix "for-" (completely, wrongly) spawned many F-words: FORBID, FORGET, FORSAKE. F-words often feel forceful and fundamental.',
    strategy:
      'FL- and FR- clusters are grid gold: FLASH, FLEET, FRESH, FROST. Four-letter F-words (FIST, FLAB, FLAP) appear frequently in word game dictionaries and are worth memorizing. The suffix -FUL turns many nouns into high-scoring adjectives: FEARFUL, FAITHFUL.',
    funFact:
      'F and V are phonetic twins — both are labiodental fricatives (made with teeth and lip), differing only in voicing. In German, the word for "father" is "Vater" — in English it\'s "father." Both descend from the same Proto-Germanic root, proving how closely F and V travel together across languages.',
  },
  g: {
    intro:
      'G starts roughly 3% of English words, with two distinct pronunciations: hard G (GET, GOLD, GULP) and soft G before E and I (GEM, GIANT). This split mirrors C\'s dual nature, both letters having absorbed sounds from the Latin-Germanic collision that shaped English. G-words span an impressive range from everyday to technical.',
    strategy:
      'GR- cluster words are among the most common in English: GRAB, GRIN, GROW, GRIM. In word games, knowing your short G-words (GO, GEL, GIG, GNU) for tight boards is crucial. For longer plays, GL- words (GLASS, GLARE, GLOOM) chain well on grids with diagonal sequences.',
    funFact:
      'G was invented by a Roman freedman named Spurinna around 230 BCE to distinguish the G and K sounds, which had both been written as C. It is one of the few letters with a documented individual inventor. Without G, "go" and "cow" would have been written identically.',
  },
  h: {
    intro:
      'H starts about 4% of English words but is one of the highest-frequency letters in English text overall, largely because of "the," "this," "that," and "have." H-words come heavily from Old English: HAND, HEAD, HEART, HELP. The letter is unique in that it can be silent (HONOR, HOUR) or strongly aspirated (HOT, HAM).',
    strategy:
      'The HE- and HO- starts give you dense word clusters in the dictionary. Short H-words (HE, HI, HO, HA) are valid in many dictionaries and valuable on cramped boards. In competitive play, knowing which long H-words are valid — HAZMAT, HIATUS — separates confident players from hesitant ones.',
    funFact:
      'H is the only letter in English that is sometimes treated as a vowel for the article "an" — "an hour," "an heir." This reflects a historical period when H was not pronounced in many French-origin words that entered English, leaving behind the vowel-article rule.',
  },
  i: {
    intro:
      'I starts about 4% of English words, predominantly through Latin prefixes. "In-" (not or into) is the most productive English prefix and generates thousands of words: INVALID, INFLATE, INSPECT. "Inter-" (between) and "intra-" (within) add another layer of richness to the I-word family.',
    strategy:
      'I-words built on "in-" prefixes give you systematic vocabulary building: once you know the root (VALID → INVALID, DIRECT → INDIRECT). Short I-words are rare on most boards — ICE, ILL, INN — making them precious when they appear. Learning I-prefixed opposites is the most efficient I-word strategy.',
    funFact:
      'The dot over lowercase "i" is called a tittle — from the Latin "titulus" (a stroke or mark). In medieval manuscripts, the tittle was added to distinguish i from other similar strokes (like m, n, u). The phrase "to a T" actually descends from "to a tittle," meaning to exact precision.',
  },
  j: {
    intro:
      'J is one of the rarest starting letters in English, accounting for less than 1% of dictionary words. It only became a distinct letter in English around the 17th century, previously sharing a slot with I. Most J-words arrive via Spanish (JALAPENO), Arabic (JASMINE, JULEP), or Hebrew (JUBILEE, JUSTICE) — it is truly a letter of borrowed words.',
    strategy:
      'Every J-word you know is an advantage — casual players often ignore J-starts entirely. JA-, JO-, and JU- are your highest-density clusters: JAB, JAM, JET, JIG, JOB, JOT, JUG. In Scrabble-style games, J carries a high point value precisely because of its rarity.',
    funFact:
      'J is the only letter that does not appear in the periodic table of elements. It is also missing from the Latin alphabet — medieval scribes used I for both sounds. The letter J owes its modern form to Italian Renaissance printers who distinguished the consonantal I with a descending tail.',
  },
  k: {
    intro:
      'K starts roughly 1.5% of English words, far fewer than its sound frequency would suggest — because the K sound is often spelled with C or CK. True K-words tend to be Old Norse or Germanic imports: KNIFE, KNIGHT, KNEEL (with a silent K), plus Yiddish contributions like KIBBUTZ and KLUTZ.',
    strategy:
      'The KN- cluster words are a hidden asset: KNACK, KNAVE, KNEEL, KNIT, KNOCK, KNOT, KNOW. The K is silent in all of them, but they are valid words that opponents may overlook. Short K-words (KEY, KID, KIT) are reliable on small grids. KI, KA, and KO are valid in some dictionaries and worth checking your game ruleset.',
    funFact:
      'The silent K in KN- words was not always silent — in Old English and Old Norse, it was pronounced. "Knight" was said like "k-niht." The K went silent around the 17th century, but the spelling was kept, giving English one of its most famous spelling quirks.',
  },
  l: {
    intro:
      'L starts about 4% of English words and is one of the most melodious letters in the language — linguists call L sounds "liquids" because they flow smoothly. Many beautiful and evocative English words start with L: LUMINOUS, LANGUID, LUSCIOUS. Latin contributed heavily via "lux" (light) and "locus" (place).',
    strategy:
      'LA-, LE-, and LO- clusters give dense word banks. Short L-words (LA, LI, LO) are valid in some dictionaries. The suffix -LY converts adjectives to adverbs and is extremely common, making L-ending words even more useful. For board strategy, L-words with double letters (LLAMA, LLANO) are rare and memorable.',
    funFact:
      'The letter L is the root of the modern pound symbol (£), standing for "libra" — the Latin unit of weight. In music, the note "la" (or "A" in the solfège system) takes its name from a Latin hymn. L also represents 50 in Roman numerals.',
  },
  m: {
    intro:
      'M starts about 4.5% of English words, making it mid-range in frequency but high in impact. M-words span the mundane (MAKE, MOVE) to the majestic (MAGNIFICENT, MYSTERIOUS). Many core emotion and body words begin with M: MIND, MOUTH, MOOD, MUSCLE — reflecting the letter\'s deep roots in Proto-Indo-European languages.',
    strategy:
      'MA-, ME-, and MO- starts are among the richest short clusters. Short M-words (MA, ME, MO, MY, MU) are valid in most word game dictionaries and valuable on tight boards. For longer scoring words, MIS- prefix words (MISUSE, MISREAD, MISTRUST) reliably extend your vocabulary reach.',
    funFact:
      'M in Roman numerals represents 1,000 — from "mille" (thousand). It is also the most common letter used in brand names, as neuroscience research suggests the M sound is one of the first sounds humans learn to produce (it mirrors the infant "mma" call for mother across many languages).',
  },
  n: {
    intro:
      'N starts roughly 2.5% of English words, but it is the second most frequent letter in English text overall. The gap exists because N ends thousands of words and appears mid-word constantly. N-words cluster heavily around negation (NO, NOT, NEVER) and nature (NIGHT, NORTH, NARROW), reflecting both Old English and Latin roots.',
    strategy:
      'Short N-words (NA, NO, NU) are useful fillers on tight boards. The NE- cluster gives excellent mid-length words: NEAR, NEAT, NEED, NEST. The prefix "non-" systematically doubles your vocabulary by negating any noun or adjective. In competitive play, knowing rare N-words like NAIAD, NARTHEX gives you grid-finding advantages.',
    funFact:
      'N is the symbol for the set of natural numbers in mathematics. In physics, N stands for Newton (unit of force). The letter descends from the Phoenician "nun," meaning fish — a fish shape turned upright over millennia to become the straight-stroked N we write today.',
  },
  o: {
    intro:
      'O starts about 3% of English words, despite being the second most common letter in English text. Most O-word appearances come from "of," "on," "or," and "one" — extremely high-frequency function words. Longer O-words often draw from Latin roots: "omni-" (all), "ob-" (against), and "oper-" (work) — OMNIVORE, OBSTACLE, OPERATE.',
    strategy:
      'Short O-words are precious: OX, OD, OE, OM, OP (all valid in standard word game dictionaries). The OU- cluster gives productive mid-range words: OUST, OURS, OUNCE, OUTER. Look for OVE- sequences on the grid — OVER is a prefix that generates OVERDO, OVERLAP, OVERRIDE.',
    funFact:
      'O is the only letter that is also a word in standard English ("Oh" and "O" for direct address). In chemistry, O is the symbol for oxygen. In musical notation, O above a string indicates an open string. The letter\'s circular shape dates back to the Phoenician "ayin," meaning eye.',
  },
  p: {
    intro:
      'P starts roughly 7% of English words — one of the highest rates among consonants — thanks to a flood of Greek and Latin borrowings: "photo-" (light), "philo-" (love), "poly-" (many), "proto-" (first), "pseudo-" (false). English absorbed these systematically through scientific and academic vocabulary, making P-words often feel technical and precise.',
    strategy:
      'PH- words are a distinct sub-category (Greek origin): PHASE, PHONE, PHOTO, PHOBIA. PL- and PR- clusters are the richest for standard words: PLAY, PLAN, PLACE, PRESS, PROUD. For high-scoring play, knowing PNEUM- (lung) and PSYCH- (mind) words gives you 6-8 letter options your opponents may miss.',
    funFact:
      'The silent P appears in dozens of English words: PNEUMONIA, PSYCHOLOGY, PTERODACTYL, PTOLEMY. These all preserve the original Greek pronunciation, where the P was voiced. English adopted the spelling without adopting the sound — a classic case of orthographic conservatism.',
  },
  q: {
    intro:
      'Q is the most challenging starting letter in English — almost every Q-word requires a U immediately following. Only about 0.1% of English words start with Q. But memorizing QI (the Chinese concept of life force, valid in Scrabble) gives you a powerful 2-letter weapon. Q-words that do exist tend to come from Latin ("qua-", "qu-") or Arabic ("qadi", "qoph").',
    strategy:
      'The QU- sequence is your primary territory: QUACK, QUIZ, QUEEN, QUEST, QUICK, QUIET, QUOTE. In Scrabble-style games, Q carries the highest point value (10 points) because of its rarity — landing it with a U on the board is worth planning for. QUIZ and QUARTZ maximize Q\'s value on triple-letter or triple-word squares.',
    funFact:
      'In the standard English alphabet, Q is almost always followed by U — but in loanwords from Arabic and other languages, QI, QOPH, QADI, and QANAT appear without a U. Tournament Scrabble players often memorize these QU-less Q-words as their secret weapon.',
  },
  r: {
    intro:
      'R starts about 5% of English words, driven by the Latin prefix "re-" (again, back) which is one of the most productive in English: RETURN, REBUILD, RESTORE, REFLECT. R is classified as a "rhotic liquid" — it can function almost like a vowel and allows English to form complex consonant clusters (STR-, SPR-, SCR-) that other languages avoid.',
    strategy:
      'The RE- prefix is a systematic vocabulary multiplier: any verb can potentially take RE- (RETHINK, REDESIGN). Short R-words (RE, REC, RIB, RIG, RIM, RIP, ROB, ROD, ROT, ROW, RUB, RUG, RUN, RUT) are abundant and board-friendly. For long-word scoring, RHYTHM (7 letters, no standard vowels) is a notable R-word every serious player should know.',
    funFact:
      'R is called the "pirate letter" due to its theatrical rolling sound, but historically, the letter represents one of the most stable sounds across Indo-European languages. The same R-sound connects English "three," Latin "tres," Greek "treis," and Sanskrit "trayas" — all meaning three.',
  },
  s: {
    intro:
      'S is the most common starting letter in English by a wide margin — roughly 15% of all dictionary words begin with S. This dominance comes from the "sub-" (under), "super-" (above), "syn-" (together), and "semi-" (half) prefixes, plus an enormous number of base words. S also forms almost every English plural, making it ubiquitous at word endings too.',
    strategy:
      'The wealth of S-words means knowing the rare and high-value ones is crucial: SPHINX, SYZYGY, SCHISM. ST- and SP- clusters give you the highest density of valid game words. For 2-letter plays, SH and SI are valid in many dictionaries. The sheer volume of S-words means opponents cannot easily predict your S-moves.',
    funFact:
      'S is the only letter that can change a word\'s grammatical category just by addition: the plural S turns nouns plural, the -s verb form marks third-person singular. In mathematics, the integral symbol ∫ is an elongated S, from "summa" (sum), introduced by Leibniz in 1675.',
  },
  t: {
    intro:
      'T is the second most common starting letter in English after S, covering about 8% of dictionary words. "The" and "to" and "that" and "this" make T extraordinarily common in text. Many T-words come from Latin "trans-" (across) and "tri-" (three), generating TRANSFER, TRANSLATE, TRIANGLE, TRIPLE — making T-words often relate to movement or structure.',
    strategy:
      'TH- is the most uniquely English consonant cluster — a sound that barely exists in other major languages. SHORT T-words (TO, TE, TAB, TAN, TAP, TAR, TEN, TIN, TON, TOO, TOP, TOT, TOW, TOY, TUB, TUG) fill boards efficiently. The TRI- prefix gives reliable 5-6 letter words on any standard board.',
    funFact:
      'T is the most common final consonant in English. "Th" represents two distinct sounds: the voiced "th" in "the" and the unvoiced "th" in "thin" — both written identically, making it one of English\'s great ambiguities for language learners.',
  },
  u: {
    intro:
      'U starts only about 2% of English words, making it rarer than you might expect for a vowel. The Latin prefix "un-" (not) is extremely productive — UNDO, UNFAIR, UNHAPPY, UNLOCK — and accounts for a large share of U-words. "Ultra-" (beyond) and "uni-" (one) add another rich vein: ULTRAVIOLET, UNICORN, UNIVERSE.',
    strategy:
      'The UN- prefix is the most reliable U-word generator: virtually any adjective or verb can take UN- to form a valid word. Short U-words (UP, US, UT, UM, UN) are valid in most dictionaries and perfect for tight boards. For longer plays, UNI- words (UNIQUE, UNITED, UNIFORM) appear reliably in word game dictionaries.',
    funFact:
      'U and V were interchangeable in Latin and medieval English — both represented the same sound and symbol. "Julius" and "Iulius" were the same name. The distinction between U (vowel) and V (consonant) was only standardized in English in the 17th century by printers following French convention.',
  },
  v: {
    intro:
      'V starts about 1.5% of English words, making it one of the rarer starting letters. Many V-words are Latin-origin (VERBAL, VIRTUE, VISION) or French imports (VILLAGE, VALOR, VOYAGE). V carries a strong visual identity — it is associated with victory, velocity, and vitality, reflecting the vigor of its sound across languages.',
    strategy:
      'Short V-words are rare and valuable: VI, VIA, VIE. The VE- cluster gives useful game words: VEIL, VEIN, VENT, VERB, VEST. In Scrabble-style games, V has moderate point value (4 points) and combines well with I and E. Knowing VOCAB, VIVID, and VAGUE gives you reliable 4-5 letter options.',
    funFact:
      'V in Roman numerals represents 5 — thought to derive from the shape of an outstretched hand (V-shape between thumb and four fingers). The peace sign (✌) and victory sign both use the V shape, connecting the gesture to the letter\'s symbolic weight across cultures.',
  },
  w: {
    intro:
      'W starts about 3.5% of English words, overwhelmingly from Old English and Germanic roots. W is not found in Latin, Greek, French, or Spanish as a native letter — it entered those languages only through English loanwords. Core English concepts cluster around W: WATER, WIND, WORK, WORLD, WORTH — the building blocks of human life.',
    strategy:
      'WH- cluster words (WHERE, WHEN, WHAT, WHICH, WHILE, WHITE) are high-frequency and reliably appear in any standard word game dictionary. Short W-words (WE, WO, WIS) give board flexibility. For longer words, WR- cluster delivers: WREN, WRAP, WRIT, WREST, WRECK — and all preserve a silent W before R.',
    funFact:
      'W is called "double U" because it originally was two U\'s (or V\'s) written together — "uu" — to represent a consonant sound that Latin had no letter for. In French, it is called "double v" for the same reason. W is the only letter whose name (in English) is longer than one syllable.',
  },
  x: {
    intro:
      'X-words are rare treasures in word games — fewer than 0.2% of English words start with X. Most X-words come from Greek (XENON, XERIC, XYLEM, XYLOPHONE) or Latin (XEROGRAPHY). This rarity gives you a genuine scoring edge: most players never scan for X-starts, letting you find words your opponents miss entirely.',
    strategy:
      'Learn your core X-words by category: science (XENON, XYLEM, XEROX), adjectives (XERIC meaning dry, XENIAL meaning hospitable), and short words (XI, the Greek letter, is valid in many dictionaries). In Scrabble-style games, X scores 8 points — combining it with a vowel on a premium square is high-percentage.',
    funFact:
      'X is used as an unknown variable in algebra because medieval translators rendered the Arabic word "shay" (thing/unknown) as "xei" in Spanish, then shortened to x. The signature X, used when one cannot write, comes from the Christian cross (chi), not from any notion of crossing something out.',
  },
  y: {
    intro:
      'Y starts about 0.5% of English words — very rare — because Y most commonly appears as a suffix (QUICKLY, HAPPY, MARRY) or in the middle of words. The Y-words that exist are often Old English survivors (YES, YET, YEAR, YOUNG, YOUR) or borrowed terms (YOGA, YUAN, YACHT). Y is unique in being both a vowel and a consonant depending on position.',
    strategy:
      'The small Y-word list is manageable to memorize: YA, YE (archaic "you"), YEW (the tree), YOD (the Hebrew letter), YUAN, YOGI, YORE, YULE. In word games, knowing that "ye" is valid gives you a powerful 2-letter play. YOGA and YAWN appear often enough on boards to be reliable mid-game finds.',
    funFact:
      'The archaic English "ye" (as in "Ye Olde Shoppe") was never pronounced "yee." The letter thorn (Þ), which looked like a Y in some medieval scripts, represented the "th" sound. Printers substituted Y for thorn, so "Ye Olde" was always read "The Olde." The Y was simply the closest available metal type.',
  },
  z: {
    intro:
      'Z carries one of the highest letter values in word games and is one of the least common starting letters — under 0.5% of English words. Words starting with Z tend to be borrowed from other languages: ZEITGEIST (German for "spirit of the age"), ZENITH (from Arabic "samt"), ZEPHYR (Greek for west wind), ZOMBIE (Bantu/West African origin). Z-words are truly international treasures.',
    strategy:
      'Knowing a handful of Z-words gives disproportionate advantage — opponents rarely check for them. Core Z-words to memorize: ZAP, ZAG, ZEN, ZIP, ZIT, ZOO (short), ZERO, ZONE, ZEST, ZEAL (mid-length), ZEALOT, ZENITH (longer). In Scrabble-style games, Z scores 10 points — the highest value alongside Q.',
    funFact:
      'Z is called "zed" in British English and "zee" in American English — one of the few letters with transatlantic pronunciation disagreement. It descends from the Greek letter zeta (Ζ), which the Romans borrowed but rarely used, since Latin had no Z sound. Z entered English mainly to transliterate Greek words, giving it an exotic, foreign flavor it has kept ever since.',
  },
};
