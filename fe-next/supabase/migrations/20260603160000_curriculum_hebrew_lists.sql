-- Hebrew language-arts curriculum word lists (grades 1-6 / יסודי).
-- Expands the curriculum library beyond the original 4 (mostly English-as-L2) seeds
-- with genuine Hebrew vocabulary: subject='hebrew', language='he'.
-- Standard codes are neutral (HE-G#) and deliberately avoid any ministry-prefixed
-- code: we make no official endorsement claim. These are grade-appropriate general
-- Hebrew vocabulary lists.
-- word_count is a GENERATED column and is intentionally omitted from the INSERT.

INSERT INTO curriculum_word_lists (name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'כיתה א׳ — מילים ראשונות',
    'אוצר מילים בסיסי לכיתה א׳: עצמים, בעלי חיים ופעולות מהיומיום.',
    'he', 'grade_1', 'hebrew', 'HE-G1',
    '[
      {"word": "שמש", "definition": "הכוכב הגדול שמאיר ומחמם ביום", "canIntegrate": true},
      {"word": "ירח", "definition": "הגוף שמאיר בשמיים בלילה", "canIntegrate": true},
      {"word": "בית", "definition": "המקום שבו גרים", "canIntegrate": true},
      {"word": "ילד", "definition": "בן צעיר", "canIntegrate": true},
      {"word": "ילדה", "definition": "בת צעירה", "canIntegrate": true},
      {"word": "ספר", "definition": "דפים עם סיפור או מידע", "canIntegrate": true},
      {"word": "חתול", "definition": "חיה קטנה שאומרת מיאו", "canIntegrate": true},
      {"word": "כלב", "definition": "חיה שנובחת ושומרת על הבית", "canIntegrate": true},
      {"word": "מים", "definition": "נוזל שקוף ששותים", "canIntegrate": true},
      {"word": "לחם", "definition": "מאכל שאופים מקמח", "canIntegrate": true},
      {"word": "אמא", "definition": "ההורָה של הילד", "canIntegrate": true},
      {"word": "אבא", "definition": "ההורֶה של הילד", "canIntegrate": true},
      {"word": "כדור", "definition": "צעצוע עגול שמשחקים בו", "canIntegrate": true},
      {"word": "פרח", "definition": "צמח צבעוני וריחני", "canIntegrate": true},
      {"word": "עץ", "definition": "צמח גבוה עם גזע וענפים", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  ),
  (
    'כיתה ב׳ — טבע ובעלי חיים',
    'מילים מעולם הטבע ובעלי החיים לכיתה ב׳.',
    'he', 'grade_2', 'hebrew', 'HE-G2',
    '[
      {"word": "ציפור", "definition": "בעל חיים שעף ויש לו כנפיים", "canIntegrate": true},
      {"word": "דג", "definition": "חיה שחיה במים ושוחה", "canIntegrate": true},
      {"word": "פרפר", "definition": "חרק צבעוני בעל כנפיים", "canIntegrate": true},
      {"word": "יער", "definition": "מקום עם הרבה עצים", "canIntegrate": true},
      {"word": "ים", "definition": "שטח גדול של מים מלוחים", "canIntegrate": true},
      {"word": "גשם", "definition": "טיפות מים שיורדות מהשמיים", "canIntegrate": true},
      {"word": "ענן", "definition": "אדים לבנים שמרחפים בשמיים", "canIntegrate": true},
      {"word": "רוח", "definition": "אוויר שנע ומזיז דברים", "canIntegrate": true},
      {"word": "דבורה", "definition": "חרק שמייצר דבש", "canIntegrate": true},
      {"word": "נמלה", "definition": "חרק קטן וחרוץ", "canIntegrate": true},
      {"word": "שמיים", "definition": "החלל הכחול שמעל הראש", "canIntegrate": true},
      {"word": "הר", "definition": "מקום גבוה מאוד באדמה", "canIntegrate": true},
      {"word": "נהר", "definition": "מים זורמים ביבשה", "canIntegrate": true},
      {"word": "אריה", "definition": "חיה חזקה שנקראת מלך החיות", "canIntegrate": true},
      {"word": "צב", "definition": "חיה איטית עם שריון", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  ),
  (
    'כיתה ג׳ — רגשות ותכונות',
    'מילות רגש ותכונות אופי לכיתה ג׳.',
    'he', 'grade_3', 'hebrew', 'HE-G3',
    '[
      {"word": "שמח", "definition": "מרגיש טוב ומלא חדווה", "canIntegrate": true},
      {"word": "עצוב", "definition": "מרגיש רע ולא טוב", "canIntegrate": true},
      {"word": "כועס", "definition": "מרגיש כעס ורוגז", "canIntegrate": true},
      {"word": "מפחד", "definition": "חושש ממשהו", "canIntegrate": true},
      {"word": "גאה", "definition": "מרוצה מעצמו או מאחר", "canIntegrate": true},
      {"word": "אמיץ", "definition": "לא נכנע לפחד ומתמודד", "canIntegrate": true},
      {"word": "נדיב", "definition": "אוהב לתת ולשתף", "canIntegrate": true},
      {"word": "סקרן", "definition": "רוצה לדעת ולגלות", "canIntegrate": true},
      {"word": "חרוץ", "definition": "עובד קשה ולא מתעצל", "canIntegrate": true},
      {"word": "ישר", "definition": "אומר אמת ולא משקר", "canIntegrate": true},
      {"word": "סבלני", "definition": "יודע לחכות ברוגע", "canIntegrate": true},
      {"word": "רגוע", "definition": "נינוח ולא לחוץ", "canIntegrate": true},
      {"word": "ביישן", "definition": "מתבייש לדבר מול אחרים", "canIntegrate": true},
      {"word": "נלהב", "definition": "מלא התלהבות ושמחה", "canIntegrate": true},
      {"word": "אכפתי", "definition": "דואג לאחרים", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  ),
  (
    'כיתה ד׳ — בית הספר והקהילה',
    'מילים מעולם בית הספר, החברים והקהילה לכיתה ד׳.',
    'he', 'grade_4', 'hebrew', 'HE-G4',
    '[
      {"word": "מורה", "definition": "אדם שמלמד תלמידים", "canIntegrate": true},
      {"word": "תלמיד", "definition": "מי שלומד בבית הספר", "canIntegrate": true},
      {"word": "שיעור", "definition": "זמן של לימוד נושא", "canIntegrate": true},
      {"word": "ספרייה", "definition": "מקום עם הרבה ספרים לקריאה ולהשאלה", "canIntegrate": true},
      {"word": "שכן", "definition": "מי שגר לידך", "canIntegrate": true},
      {"word": "קהילה", "definition": "קבוצת אנשים שחיים יחד במקום אחד", "canIntegrate": true},
      {"word": "מתנדב", "definition": "מי שעוזר בלי לקבל תשלום", "canIntegrate": true},
      {"word": "חבר", "definition": "אדם קרוב שאוהבים ובוטחים בו", "canIntegrate": true},
      {"word": "כלל", "definition": "חוק שמסכימים לפעול לפיו", "canIntegrate": true},
      {"word": "אחריות", "definition": "מחויבות לעשות משהו כמו שצריך", "canIntegrate": true},
      {"word": "כבוד", "definition": "יחס מכבד כלפי אדם אחר", "canIntegrate": true},
      {"word": "שיתוף", "definition": "לחלוק ולעבוד יחד", "canIntegrate": true},
      {"word": "הגינות", "definition": "התנהגות צודקת והוגנת", "canIntegrate": true},
      {"word": "סובלנות", "definition": "קבלה של מי ששונה ממך", "canIntegrate": true},
      {"word": "עזרה", "definition": "פעולה שמקלה על אדם אחר", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  ),
  (
    'כיתה ה׳ — שפה עשירה ומילים נרדפות',
    'מילים מתארות ומילים נרדפות להעשרת אוצר המילים בכיתה ה׳.',
    'he', 'grade_5', 'hebrew', 'HE-G5',
    '[
      {"word": "מהיר", "definition": "נע בקצב גבוה", "canIntegrate": true},
      {"word": "איטי", "definition": "נע לאט", "canIntegrate": true},
      {"word": "ענק", "definition": "גדול מאוד", "canIntegrate": true},
      {"word": "זעיר", "definition": "קטן מאוד", "canIntegrate": true},
      {"word": "יפהפה", "definition": "יפה במיוחד", "canIntegrate": true},
      {"word": "נדיר", "definition": "לא שכיח, קשה למצוא", "canIntegrate": true},
      {"word": "מרהיב", "definition": "מרשים ומלא יופי", "canIntegrate": true},
      {"word": "מורכב", "definition": "בנוי מהרבה חלקים, לא פשוט", "canIntegrate": true},
      {"word": "ברור", "definition": "קל להבנה", "canIntegrate": true},
      {"word": "מעורפל", "definition": "לא ברור ומטושטש", "canIntegrate": true},
      {"word": "שקט", "definition": "בלי רעש", "canIntegrate": true},
      {"word": "רועש", "definition": "מלא רעש", "canIntegrate": true},
      {"word": "עתיק", "definition": "ישן מאוד, מימים עברו", "canIntegrate": true},
      {"word": "חדיש", "definition": "חדש ומתקדם", "canIntegrate": true},
      {"word": "מופלא", "definition": "נפלא ומדהים", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  ),
  (
    'כיתה ו׳ — מילים מופשטות וערכים',
    'מושגים מופשטים וערכים להעשרת השפה והדיון בכיתה ו׳.',
    'he', 'grade_6', 'hebrew', 'HE-G6',
    '[
      {"word": "חירות", "definition": "חופש לבחור ולפעול", "canIntegrate": true},
      {"word": "צדק", "definition": "מצב שבו נוהגים בהגינות", "canIntegrate": true},
      {"word": "שוויון", "definition": "יחס שווה לכל אדם", "canIntegrate": true},
      {"word": "אמת", "definition": "מה שתואם את המציאות", "canIntegrate": true},
      {"word": "חוכמה", "definition": "ידע עמוק ושיקול דעת", "canIntegrate": true},
      {"word": "דמיון", "definition": "היכולת לחשוב על דברים חדשים", "canIntegrate": true},
      {"word": "השראה", "definition": "דחף פנימי ליצור או לפעול", "canIntegrate": true},
      {"word": "התמדה", "definition": "המשך מאמץ למרות קשיים", "canIntegrate": true},
      {"word": "אחדות", "definition": "מצב של חיבור ושיתוף", "canIntegrate": true},
      {"word": "סקרנות", "definition": "רצון עז לדעת ולחקור", "canIntegrate": true},
      {"word": "אמפתיה", "definition": "היכולת להבין את רגשות הזולת", "canIntegrate": true},
      {"word": "יושרה", "definition": "דבקות בערכים ובאמת", "canIntegrate": true},
      {"word": "מסירות", "definition": "נאמנות ומאמץ למען מטרה", "canIntegrate": true},
      {"word": "תקווה", "definition": "אמונה שדברים טובים יקרו", "canIntegrate": true},
      {"word": "הוקרה", "definition": "הערכה ותודה על מה שקיבלת", "canIntegrate": true}
    ]'::jsonb,
    TRUE
  )
ON CONFLICT DO NOTHING;
