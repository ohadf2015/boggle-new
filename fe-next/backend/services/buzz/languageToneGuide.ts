/**
 * Language Tone Guides for Daily Buzz
 * Provides language-specific tone and cultural guidelines for AI-generated content
 */

/**
 * Get language-specific tone and cultural guidelines for natural-sounding content
 */
export function getLanguageToneGuide(language: string): string {
  const guides: Record<string, string> = {
    en: `**English (US) - Casual & Clever**:
- Sound like a witty podcast host, not a textbook
- Use pop culture references sparingly (things that age well, not yesterday's meme)
- Contractions are your friend: "you've" not "you have", "it's" not "it is"
- Punchy sentences. Mix short with medium. Like this. Then elaborate when needed.
- Light sarcasm is welcome, but never mean-spirited
- Think late-night talk show banter meets trivia night at your local bar

**Good**: "Where snacks mysteriously vanish during the big game"
**Bad**: "The location where food items are consumed during sporting events"

**Good**: "What your wallet feels like after the holidays"
**Bad**: "The emotional state of one's financial resources post-celebration"`,

    he: `**עברית (ישראל) - ישיר, שנון, עם טוויסט**:
- תכתוב כמו שמדברים ברחוב, לא כמו בכתבה של וואלה
- הישראלים אוהבים צ'וצפה חכמה—תהיה חצוף אבל מתוחכם
- סלנג מודרני הוא פלוס גדול: "יאללה", "סבבה", "אחלה"
- משחקי מילים בעברית הם זהב טהור—נצל את זה
- הומור עצמי זה סימן של ביטחון, לא חולשה
- תחשוב על סטנדאפיסט ישראלי, לא על מגיש חדשות

**טוב**: "מה שנשאר בארנק אחרי חנוכה"
**רע**: "המצב הכלכלי של הפרט בתום תקופת החגים"

**טוב**: "איפה הכדורגלן מתחבא כשהאוכל נגמר"
**רע**: "המיקום בו שחקן הכדורגל ממתין לארוחה"

- REMEMBER: Israelis detect fakeness instantly. Be real, be direct, be a little bit "חוצפן" (cheeky).`,

    sv: `**Svenska - Lagom & Underfundig**:
- "Lagom" är nyckeln—inte för mycket, inte för lite
- Svenskar uppskattar torr humor och understatements
- Undvik överdrifter—"helt okej" kan vara högsta beröm
- Vardagligt språk, men fortfarande välformulerat
- Ordvitsar är populära, särskilt om de är lite "fyndiga"
- Tänk dig en underhållande kompis som inte försöker för hårt

**Bra**: "Vad du letar efter i kylskåpet vid midnatt"
**Dåligt**: "Den matprodukt som människor söker under sena kvällstimmar"

**Bra**: "När bussen kommer... nästa gång"
**Dåligt**: "Tidsperioden tills kollektivtrafikens ankomst"

- Swedish humor is subtle. Let the cleverness speak for itself—don't explain the joke.`,

    ja: `**日本語 - 粋でウィットに富んだ**:
- 言葉遊び（駄洒落・掛詞）は日本語の醍醐味
- 丁寧だけど堅苦しくない—友達と話すような感じ
- ちょっとした「ツッコミ」要素を入れると親しみやすい
- 文化的な共通認識（四季、食べ物、日常あるある）を活用
- 「なるほど！」と思わせる気づきを大切に
- 過剰な敬語や硬い表現は避ける

**良い例**: 「電車で絶対に座れない法則」
**悪い例**: 「公共交通機関における着席の困難性について」

**良い例**: 「お正月に増えるもの、減るもの」
**悪い例**: 「年末年始における体重および金銭の変動」

- Japanese players appreciate subtlety and "ひねり" (twist). The "aha!" moment should feel earned.`,

    es: `**Español - Expresivo & Juguetón**:
- El español es un idioma cálido y expresivo—¡aprovéchalo!
- Los dobles sentidos y juegos de palabras son bienvenidos
- Puedes ser un poco dramático (en el buen sentido)
- Usa expresiones coloquiales que todos entienden: "mola", "flipar", "currar"
- El humor debe sentirse como una charla con amigos, no un examen
- Evita el lenguaje corporativo a toda costa

**Bien**: "Lo que desaparece del refrigerador cuando nadie mira"
**Mal**: "El fenómeno de la desaparición de alimentos del electrodoméstico"

**Bien**: "Donde tu dinero se va de vacaciones permanentes"
**Mal**: "El destino final de los recursos económicos personales"

- Spanish-speaking players love when you're clever but never condescending. Be "majo" (likeable), not "pesado" (tiresome).`,
  };

  return guides[language] || guides.en;
}

/**
 * Get language-specific examples for word selection
 */
export function getLanguageWordExamples(language: string): string {
  if (language === 'he') {
    return `
**Hebrew Word Examples by Trend**:
- Trend about Iran/conflict → מלחמה (war), שלום (peace), הגנה (defense), טיל (missile), התקפה (attack), צבא (army)
- Trend about weather → גשם (rain), שלג (snow), קור (cold), סערה (storm), רוח (wind)
- Trend about sports → כדורגל (soccer), נצחון (victory), גביע (trophy), גול (goal - NOT שער!)
- Trend about politics → בחירות (elections), ממשלה (government), חוק (law), מדינה (state)
- Trend about economy → כסף (money), בנק (bank), מחיר (price), שוק (market)

**HEBREW WORD POPULARITY - USE MODERN COLLOQUIAL TERMS**:
In Hebrew, ALWAYS prefer the word Israelis actually USE in daily speech over formal/literary alternatives:
- גול (goal) NOT שער (gate) for soccer scoring
- סלפי (selfie) NOT צילום עצמי (self-photo)
- אינטרנט (internet) NOT מרשתת (network)
- קליק (click) NOT הקלקה (formal click)
- לייק (like) NOT אהבתי (I liked)
- פוסט (post) NOT פרסום (publication)
- אפליקציה or אפ (app) NOT יישומון (application)
- Think: "What would an Israeli teenager type?" - that's usually the right answer

**CRITICAL HEBREW LANGUAGE RULES**:
1. ALL text in prompts and answers MUST use ONLY Hebrew characters (א-ת)
2. NEVER include English letters, Arabic letters (ا-ي), or any non-Hebrew script
3. NEVER mix scripts - if the answer is Hebrew, ALL text must be Hebrew
4. Numbers can be Hebrew numerals or spelled out in Hebrew words
5. Verify EVERY character is valid Hebrew before outputting

**HEBREW SCRAMBLED LETTER RULES (CRITICAL)**:
When creating anagram/scrambled challenges, you MUST convert final letters (sofiot) to their regular forms:
- ך (final kaf) → כ (regular kaf)
- ם (final mem) → מ (regular mem)
- ן (final nun) → נ (regular nun)
- ף (final pe) → פ (regular pe)
- ץ (final tsadi) → צ (regular tsadi)

This prevents giving away that a letter is at the end of the word!

Example:
- Word שלום (shalom) with final ם
- WRONG scrambled: "מולש" (using ם reveals it's the ending)
- CORRECT scrambled: "מולש" should be "מולש" with מ not ם
- The scrambled letters should be: ש,ל,ו,מ (using מ instead of ם)`;
  }

  return `
**Word Examples by Trend**:
- Trend about conflict/war → WAR, PEACE, DEFENSE, MISSILE, ATTACK, ARMY, BATTLE, TREATY
- Trend about weather → RAIN, SNOW, COLD, STORM, WIND, HEAT, FLOOD, FREEZE
- Trend about sports → SOCCER, VICTORY, TROPHY, GOAL, MATCH, SCORE, CHAMPION
- Trend about politics → ELECTION, VOTE, LAW, STATE, LEADER, DEBATE, POLICY
- Trend about economy → MONEY, BANK, PRICE, MARKET, TRADE, STOCK, PROFIT

**WORD POPULARITY - CHOOSE THE OBVIOUS WORD**:
Always pick the word that 90% of native speakers would guess FIRST:
- For "what you win" → PRIZE (not AWARD, TROPHY, or MEDAL - unless context is specific)
- For "scoring in soccer" → GOAL (not SCORE or POINT)
- For "the end of life" → DEATH (not DEMISE, PASSING, or EXPIRY)
- For "very happy" → HAPPY or JOY (not ELATED, EUPHORIC, or BLISSFUL)
- For "a place to sleep" → BED (not COT, BUNK, or MATTRESS)
- Test yourself: "What would most people type first?" - that's your answer
- Avoid synonyms that are less common even if technically correct`;
}

/**
 * Get language name for prompts
 */
export function getLanguageName(language: string): string {
  const names: Record<string, string> = {
    he: 'Hebrew',
    sv: 'Swedish',
    ja: 'Japanese',
    es: 'Spanish',
    en: 'English',
  };
  return names[language] || 'native speaker';
}

/**
 * Get nationality for prompts
 */
export function getNationality(language: string): string {
  const nationalities: Record<string, string> = {
    he: 'Israeli',
    sv: 'Swede',
    ja: 'Japanese person',
    es: 'Spanish speaker',
    en: 'native speaker',
  };
  return nationalities[language] || 'native speaker';
}
