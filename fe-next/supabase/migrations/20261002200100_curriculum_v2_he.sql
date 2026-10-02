-- Curriculum word lists v2 (he): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/he.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

UPDATE curriculum_word_lists SET is_active = FALSE WHERE curriculum_standard IN ('HE-G1', 'HE-G2', 'HE-G3', 'HE-G4', 'HE-G5', 'HE-G6');

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'bf90ff79-1281-584b-8e47-b183fb6b7d03', $t$כיתה א׳ — מילים ראשונות$t$,
    $t$מילים ראשונות מהבית, מהגן ומהמשפחה, לקוראים צעירים. לכל מילה הסבר פשוט ומשפט קצר להקראה בכיתה.$t$,
    'he', 'grade_1', 'hebrew', 'LC-HE-G1-FIRST',
    $j$[
      {"word":"שמש","definition":"הכוכב הגדול שמאיר ומחמם אותנו ביום","example":"היום יש שמש חזקה, אז חובשים כובע.","level":"support","canIntegrate":true},
      {"word":"ירח","definition":"הכדור המאיר שרואים בשמיים בלילה","example":"בלילה ראינו ירח מלא ועגול מעל הגג.","level":"support","canIntegrate":true},
      {"word":"בית","definition":"המקום שבו גרים עם המשפחה","example":"לסבתא יש בית קטן עם גינה.","level":"support","canIntegrate":true},
      {"word":"ילד","definition":"בן צעיר שעוד לא גדל להיות מבוגר","example":"בגן יש ילד חדש בשם יואב.","level":"support","canIntegrate":true},
      {"word":"ילדה","definition":"בת צעירה שעוד לא גדלה להיות מבוגרת","example":"ילדה אחת עזרה לי לאסוף את הצבעים.","level":"support","canIntegrate":true},
      {"word":"ספר","definition":"דפים עם מילים או ציורים, כרוכים יחד, שקוראים בהם","example":"אבא הקריא לי ספר על דינוזאורים לפני השינה.","level":"support","canIntegrate":true},
      {"word":"חתול","definition":"חיית מחמד רכה עם שפם, שמגרגרת ואומרת מיאו","example":"יש לנו חתול ג׳ינג׳י שאוהב לישון על הספה.","level":"core","canIntegrate":true},
      {"word":"כלב","definition":"חיית מחמד שנובחת, מכשכשת בזנב ושומרת על הבית","example":"לשכנים יש כלב גדול שנובח על הדוור.","level":"core","canIntegrate":true},
      {"word":"מים","definition":"נוזל שקוף ששותים כשצמאים","example":"אחרי הריצה שתיתי כוס מים קרים.","level":"core","canIntegrate":true},
      {"word":"לחם","definition":"מאכל שאופים מקמח, ומכינים ממנו כריכים","example":"קנינו לחם טרי במאפייה.","level":"core","canIntegrate":true},
      {"word":"אימא","definition":"ההורה שהיא אישה","example":"אימא שלי מכינה פנקייקים בשישי בבוקר.","level":"core","canIntegrate":true},
      {"word":"אבא","definition":"ההורה שהוא גבר","example":"אבא לימד אותי לרכוב על אופניים.","level":"core","canIntegrate":true},
      {"word":"כדור","definition":"צעצוע עגול שזורקים, בועטים או מקפיצים","example":"זרקתי כדור גבוה והוא נתקע על העץ.","level":"core","canIntegrate":true},
      {"word":"פרח","definition":"החלק הצבעוני והריחני של הצמח","example":"בגינה צמח פרח אדום ויפה.","level":"core","canIntegrate":true},
      {"word":"כיסא","definition":"רהיט שיושבים עליו, עם רגליים ומשענת לגב","example":"הזזתי כיסא קרוב לשולחן כדי לצייר.","level":"challenge","canIntegrate":true},
      {"word":"משפחה","definition":"אנשים שקשורים זה לזה, כמו הורים, ילדים, אחים וסבים","example":"בחג כל משפחה מתאספת לארוחה גדולה.","level":"challenge","canIntegrate":true},
      {"word":"תינוק","definition":"ילד קטן מאוד שעוד לא הולך ולא מדבר","example":"נולד לנו תינוק, ועכשיו אני אח גדול!","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '2e34bddc-3c23-511f-bcce-3be9115bf9e0', $t$כיתה ב׳ — טבע ובעלי חיים$t$,
    $t$בעלי חיים, מזג אוויר ונוף שילדים פוגשים בטיול ובחצר. הסברים קצרים ומשפטים מחיי היום־יום.$t$,
    'he', 'grade_2', 'science', 'LC-HE-G2-NATURE',
    $j$[
      {"word":"ציפור","definition":"בעל חיים עם נוצות וכנפיים, שרובם יודעים לעוף","example":"על אדן החלון עמדה ציפור קטנה וציפצפה.","level":"support","canIntegrate":true},
      {"word":"פרפר","definition":"חרק עם כנפיים צבעוניות, שבהתחלה היה זחל","example":"פרפר לבן נח על הפרח בגינה.","level":"support","canIntegrate":true},
      {"word":"גשם","definition":"טיפות מים שיורדות מהעננים","example":"ירד גשם חזק, אז לקחנו מטרייה.","level":"support","canIntegrate":true},
      {"word":"ענן","definition":"ערימה לבנה או אפורה של טיפות מים זעירות שמרחפת בשמיים","example":"ענן שחור כיסה את השמש.","level":"support","canIntegrate":true},
      {"word":"שלג","definition":"פתיתים לבנים וקרים שיורדים מהשמיים כשקר מאוד","example":"בחורף ירד שלג על החרמון.","level":"support","canIntegrate":true},
      {"word":"רוח","definition":"אוויר שזז ומזיז עלים, עננים ועפיפונים","example":"נשבה רוח חזקה והעפיפון עף גבוה.","level":"core","canIntegrate":true},
      {"word":"יער","definition":"שטח גדול שיש בו הרבה מאוד עצים","example":"יער ירוק וגדול מקיף את הכפר.","level":"core","canIntegrate":true},
      {"word":"נהר","definition":"מים מתוקים שזורמים כל הזמן ביבשה, עד לים או לאגם","example":"הירדן הוא נהר ארוך בצפון הארץ.","level":"core","canIntegrate":true},
      {"word":"חוף","definition":"רצועת החול או האבנים בין היבשה לים","example":"בקיץ בנינו ארמון חול על חוף הים.","level":"core","canIntegrate":true},
      {"word":"דבורה","definition":"חרק מזמזם שאוסף צוף מפרחים ומייצר דבש","example":"דבורה עפה מפרח לפרח כל הבוקר.","level":"core","canIntegrate":true},
      {"word":"נמלה","definition":"חרק קטן וחרוץ שחי בקן עם המון חברים","example":"נמלה סחבה פירור גדול פי כמה ממנה.","level":"core","canIntegrate":true},
      {"word":"אריה","definition":"חתול פרא גדול וחזק; לזכר יש רעמה סביב הראש","example":"בספארי ראינו אריה שוכב בצל.","level":"core","canIntegrate":true},
      {"word":"ארנב","definition":"בעל חיים פרוותי עם אוזניים ארוכות, שקופץ מהר","example":"ארנב לבן קפץ מאחורי השיח.","level":"core","canIntegrate":true},
      {"word":"גבעה","definition":"הר קטן ונמוך","example":"טיפסנו על גבעה ומשם ראינו את כל העיר.","level":"challenge","canIntegrate":true},
      {"word":"שמיים","definition":"כל מה שמעלינו, איפה שנמצאים העננים, השמש והכוכבים","example":"בלילה בהיר רואים שמיים מלאי כוכבים.","level":"challenge","canIntegrate":true},
      {"word":"צפרדע","definition":"בעל חיים קטן שקופץ, מקרקר וחי ליד מים","example":"בבריכה ישבה צפרדע וקרקרה כל הלילה.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0aa30e71-c9bd-5c55-8704-ad5e43ae7a1a', $t$כיתה ג׳ — רגשות ותכונות$t$,
    $t$מילים לתאר איך מרגישים ואיך מתנהגים, לשיחות כיתה ולכתיבה אישית. כל מילה מופיעה במשפט עם דמות.$t$,
    'he', 'grade_3', 'general', 'LC-HE-G3-FEELINGS',
    $j$[
      {"word":"שמח","definition":"מרגיש טוב, מחייך ורוצה לצחוק","example":"דני היה שמח כשקיבל מכתב מסבא.","level":"support","canIntegrate":true},
      {"word":"עצוב","definition":"מרגיש רע בלב, לפעמים עד כדי בכי","example":"הילד היה עצוב כי הכדור שלו אבד.","level":"support","canIntegrate":true},
      {"word":"כועס","definition":"מרגיש רוגז חזק כשמשהו נראה לא הוגן","example":"אחי כועס כי הפילו לו את המגדל.","level":"support","canIntegrate":true},
      {"word":"מפחד","definition":"מרגיש שמשהו רע עלול לקרות","example":"הגור מפחד מרעש של רעמים.","level":"support","canIntegrate":true},
      {"word":"רגוע","definition":"שקט ונינוח, לא לחוץ ולא עצבני","example":"אחרי כמה נשימות עמוקות נעשיתי רגוע יותר.","level":"core","canIntegrate":true},
      {"word":"גאה","definition":"מרגיש טוב עם משהו שעשה הוא או מישהו קרוב לו","example":"אבא גאה בי כי סיימתי את הפאזל לבד.","level":"core","canIntegrate":true},
      {"word":"אמיץ","definition":"עושה את מה שנכון גם כשמפחיד","example":"יונתן היה אמיץ וסיפר למורה מה קרה.","level":"core","canIntegrate":true},
      {"word":"נדיב","definition":"אוהב לתת ולחלוק עם אחרים","example":"רועי נדיב וחילק עוגיות לכל הכיתה.","level":"core","canIntegrate":true},
      {"word":"סקרן","definition":"רוצה לדעת, לשאול ולגלות דברים חדשים","example":"החתול סקרן ומכניס את האף לכל קופסה.","level":"core","canIntegrate":true},
      {"word":"חרוץ","definition":"עובד קשה ומתאמץ עד שהוא מסיים","example":"התלמיד חרוץ ומכין שיעורים כל יום.","level":"core","canIntegrate":true},
      {"word":"ישר","definition":"אומר את האמת ולא מרמה","example":"עומר ישר והחזיר את הארנק שמצא.","level":"core","canIntegrate":true},
      {"word":"ביישן","definition":"מתבייש ומתקשה לדבר מול אנשים שהוא לא מכיר","example":"בהתחלה נדב היה ביישן, ועכשיו הוא מדבר עם כולם.","level":"core","canIntegrate":true},
      {"word":"סבלני","definition":"יודע לחכות בשקט בלי להתעצבן","example":"המדריך סבלני ומסביר שוב ושוב.","level":"challenge","canIntegrate":true},
      {"word":"נלהב","definition":"מלא התלהבות ומחכה למשהו בקוצר רוח","example":"גיל נלהב לקראת הטיול השנתי.","level":"challenge","canIntegrate":true},
      {"word":"אכפתי","definition":"דואג לאחרים ושם לב לאיך שהם מרגישים","example":"איתי אכפתי ושאל את החבר החדש אם הוא רוצה לשחק.","level":"challenge","canIntegrate":true},
      {"word":"מאוכזב","definition":"מרגיש רע כשמשהו שקיווה לו לא קרה","example":"יואב מאוכזב כי המשחק בוטל בגלל הגשם.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '6dc491c1-f915-527c-a748-a69c19c8f13f', $t$כיתה ד׳ — בית הספר והקהילה$t$,
    $t$מילים על החיים המשותפים בכיתה, בשכונה ובקהילה, יחד עם ערכים כמו אחריות וכבוד.$t$,
    'he', 'grade_4', 'general', 'LC-HE-G4-COMMUNITY',
    $j$[
      {"word":"מורה","definition":"אדם שמלמד בכיתה ועוזר לתלמידים להבין","example":"יש לנו מורה חדשה לאנגלית.","level":"support","canIntegrate":true},
      {"word":"תלמיד","definition":"מי שלומד בבית ספר","example":"כל תלמיד קיבל מחברת חדשה.","level":"support","canIntegrate":true},
      {"word":"שיעור","definition":"זמן קבוע שבו לומדים נושא אחד בכיתה","example":"יש לנו עכשיו שיעור מדעים במעבדה.","level":"support","canIntegrate":true},
      {"word":"חבר","definition":"מישהו שאוהבים, סומכים עליו ונהנים להיות איתו","example":"יש לי חבר טוב שגר בבניין שלנו.","level":"support","canIntegrate":true},
      {"word":"שכן","definition":"מי שגר קרוב אליך, בבית או בדירה סמוכה","example":"בקומה מעלינו גר שכן נחמד עם כלב.","level":"support","canIntegrate":true},
      {"word":"ספרייה","definition":"מקום עם הרבה ספרים שאפשר לקרוא ולשאול הביתה","example":"בבית הספר נפתחה ספרייה חדשה ומוארת.","level":"core","canIntegrate":true},
      {"word":"שכונה","definition":"חלק מהעיר עם רחובות, בתים ואנשים שגרים קרוב","example":"זו שכונה שקטה עם גן משחקים גדול.","level":"core","canIntegrate":true},
      {"word":"כלל","definition":"הוראה שכולם מסכימים לפעול לפיה","example":"בכיתה שלנו יש כלל: מרימים יד לפני שמדברים.","level":"core","canIntegrate":true},
      {"word":"עזרה","definition":"מה שנותנים למישהו כדי להקל עליו","example":"סבתא ביקשה עזרה עם הסלים הכבדים.","level":"core","canIntegrate":true},
      {"word":"שיתוף","definition":"לחלוק עם אחרים ולעבוד יחד","example":"בזכות שיתוף פעולה גמרנו את הפאזל מהר.","level":"core","canIntegrate":true},
      {"word":"כבוד","definition":"יחס שמראה שאדם אחר חשוב לך, למשל להקשיב לו ולא להעליב","example":"גם בוויכוח מגיע לכל אחד כבוד.","level":"core","canIntegrate":true},
      {"word":"קהילה","definition":"קבוצת אנשים שגרים או פועלים יחד ודואגים זה לזה","example":"הקיבוץ הוא קהילה קטנה שבה כולם מכירים את כולם.","level":"core","canIntegrate":true},
      {"word":"מתנדב","definition":"מי שעוזר לאחרים מרצונו, בלי לקבל כסף","example":"אחי מתנדב פעם בשבוע במקלט לכלבים.","level":"challenge","canIntegrate":true},
      {"word":"אחריות","definition":"לדאוג שמשהו ייעשה כמו שצריך, ולעמוד מאחורי מה שעשית","example":"השבוע יש לי אחריות על הצמחים בכיתה.","level":"challenge","canIntegrate":true},
      {"word":"הגינות","definition":"התנהגות צודקת שבה כל אחד מקבל את מה שמגיע לו","example":"המשחק עבד יפה כי הייתה הגינות: כל אחד קיבל תור.","level":"challenge","canIntegrate":true},
      {"word":"סובלנות","definition":"קבלה של אנשים שחושבים או נראים אחרת ממך","example":"בכיתה מגוונת חשובה סובלנות כלפי כל אחד.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '1d536ec0-a02b-56e9-9474-ca4126caf7a9', $t$כיתה ה׳ — שפה עשירה: תארים ומילים נרדפות$t$,
    $t$תארים שמעשירים כתיבה ודיבור, בזוגות של הפכים ונרדפות. מתאים לשיעורי הבעה ולהעשרת חיבורים.$t$,
    'he', 'grade_5', 'hebrew', 'LC-HE-G5-RICH',
    $j$[
      {"word":"מהיר","definition":"נע או פועל בקצב גבוה","example":"סוס מהיר ניצח במרוץ.","level":"support","canIntegrate":true},
      {"word":"ענק","definition":"גדול מאוד, הרבה יותר מהרגיל","example":"בגן החיות ראינו צב ענק.","level":"support","canIntegrate":true},
      {"word":"זעיר","definition":"קטן מאוד, כמעט שלא רואים אותו","example":"מתחת לזכוכית המגדלת ראינו חרק זעיר.","level":"support","canIntegrate":true},
      {"word":"שקט","definition":"בלי רעש, או עם מעט מאוד רעש","example":"בלילה הרחוב שקט לגמרי.","level":"support","canIntegrate":true},
      {"word":"רועש","definition":"מלא רעש וקולות חזקים","example":"השוק רועש בבוקר יום שישי.","level":"support","canIntegrate":true},
      {"word":"ברור","definition":"קל להבנה, בלי ספקות","example":"ההסבר של המורה היה ברור מאוד.","level":"core","canIntegrate":true},
      {"word":"נדיר","definition":"לא קורה הרבה, וקשה למצוא אותו","example":"בשמורה גדל צמח נדיר שמוגן בחוק.","level":"core","canIntegrate":true},
      {"word":"עתיק","definition":"ישן מאוד, מתקופות רחוקות","example":"בחפירה מצאו מטבע עתיק מימי הרומאים.","level":"core","canIntegrate":true},
      {"word":"חדיש","definition":"חדש ומודרני, לפי הרעיונות האחרונים","example":"בבית החולים יש מכשיר חדיש לצילום.","level":"core","canIntegrate":true},
      {"word":"יפהפה","definition":"יפה מאוד, עד שקשה להוריד ממנו את העיניים","example":"ראינו נוף יפהפה מראש ההר.","level":"core","canIntegrate":true},
      {"word":"מורכב","definition":"בנוי מהרבה חלקים, ולכן לא פשוט להבין אותו","example":"בנינו דגם לגו מורכב עם מאות חלקים.","level":"core","canIntegrate":true},
      {"word":"עדין","definition":"רך ונעים, לא חזק ולא גס","example":"לחתלתול יש גוף עדין, צריך להחזיק אותו בזהירות.","level":"core","canIntegrate":true},
      {"word":"מרהיב","definition":"יפה ומרשים כל כך שעוצרים להסתכל","example":"ראינו מופע זיקוקים מרהיב ביום העצמאות.","level":"challenge","canIntegrate":true},
      {"word":"מעורפל","definition":"לא ברור ולא חד, כמו מאחורי ערפל","example":"הזיכרון מהגן כבר מעורפל אצלי.","level":"challenge","canIntegrate":true},
      {"word":"מופלא","definition":"מדהים ונפלא, כמעט כמו קסם","example":"מתחת למים מסתתר עולם מופלא של דגים ואלמוגים.","level":"challenge","canIntegrate":true},
      {"word":"צלול","definition":"שקוף ונקי, או ברור וחד כמו צליל של פעמון","example":"לזמרת יש קול צלול וחזק.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'd1bc4621-6a1e-5b05-8135-a2394fbce5c4', $t$כיתה ו׳ — ערכים ומילים מופשטות$t$,
    $t$מושגים מופשטים לשיחה, לוויכוח ולכתיבה טיעונית. ההסברים קושרים כל ערך למעשה מוחשי.$t$,
    'he', 'grade_6', 'general', 'LC-HE-G6-VALUES',
    $j$[
      {"word":"אמת","definition":"מה שנכון ותואם למה שקרה, בלי שקר","example":"היה קשה, אבל דנה אמרה אמת והודתה בטעות.","level":"support","canIntegrate":true},
      {"word":"צדק","definition":"מצב שבו כל אחד מקבל יחס הוגן","example":"העובדים הפגינו כדי לדרוש צדק.","level":"support","canIntegrate":true},
      {"word":"תקווה","definition":"אמונה שבעתיד יקרו דברים טובים","example":"אחרי הסערה הייתה תקווה שהשמש תחזור.","level":"support","canIntegrate":true},
      {"word":"חכמה","definition":"ידע עמוק יחד עם היכולת להחליט נכון","example":"סבא אמר שיש חכמה גדולה בהקשבה.","level":"support","canIntegrate":true},
      {"word":"דמיון","definition":"היכולת לראות בראש דברים שלא קיימים ולהמציא רעיונות חדשים","example":"עם קצת דמיון, קופסת קרטון הופכת לחללית.","level":"core","canIntegrate":true},
      {"word":"שוויון","definition":"מצב שבו לכל אדם יש אותן זכויות ואותן הזדמנויות","example":"חשוב שיהיה שוויון בין בנות לבנים בספורט.","level":"core","canIntegrate":true},
      {"word":"חירות","definition":"חופש לבחור ולפעול בלי שאיש ישעבד אותך","example":"בפסח חוגגים את היציאה מעבדות אל חירות.","level":"core","canIntegrate":true},
      {"word":"סקרנות","definition":"רצון חזק לדעת, לשאול ולחקור","example":"הילדה מלאה סקרנות לגבי כוכבים וחלל.","level":"core","canIntegrate":true},
      {"word":"התמדה","definition":"להמשיך להתאמץ גם כשקשה, עד שמצליחים","example":"בזכות התמדה למדתי לנגן בגיטרה.","level":"core","canIntegrate":true},
      {"word":"אחדות","definition":"תחושה שכולם ביחד, למרות ההבדלים","example":"ביום הספורט הייתה אחדות בין כל השכבות.","level":"core","canIntegrate":true},
      {"word":"השראה","definition":"רעיון או הרגשה שגורמים לך לרצות ליצור או לפעול","example":"הים נותן לציירת השראה לציורים חדשים.","level":"core","canIntegrate":true},
      {"word":"אמפתיה","definition":"היכולת להרגיש ולהבין מה מישהו אחר מרגיש","example":"כשעזרת לו לקום, הראית אמפתיה אמיתית.","level":"challenge","canIntegrate":true},
      {"word":"יושרה","definition":"לעמוד מאחורי האמת והערכים שלך גם כשאף אחד לא רואה","example":"לספר למורה על טעות לטובתך בציון זו יושרה.","level":"challenge","canIntegrate":true},
      {"word":"מסירות","definition":"נאמנות ומאמץ גדול למען מישהו או למען מטרה","example":"המאמן מראה מסירות לקבוצה כבר עשר שנים.","level":"challenge","canIntegrate":true},
      {"word":"הוקרה","definition":"הבעת תודה והערכה על מה שמישהו עשה","example":"הכיתה הכינה כרטיס הוקרה לצוות הניקיון.","level":"challenge","canIntegrate":true},
      {"word":"נחישות","definition":"החלטה חזקה לא לוותר עד שמגיעים למטרה","example":"נדרשה נחישות כדי לסיים את המרתון.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'd5bab4b7-d52b-5d66-a803-660525b97388', $t$כיתה ג׳ — מילים בחשבון$t$,
    $t$המילים שילדים צריכים כדי לקרוא שאלה מילולית: פעולות, צורות ומדידה. כל הסבר מגיע עם דוגמה במספרים.$t$,
    'he', 'grade_3', 'math', 'LC-HE-G3-MATH',
    $j$[
      {"word":"מספר","definition":"סימן שמראה כמה יש, למשל 5 או 12","example":"בחר מספר בין אחת לעשר.","level":"support","canIntegrate":true},
      {"word":"חיבור","definition":"פעולה שבה מצרפים מספרים יחד, למשל 3+4","example":"בתרגיל חיבור כותבים פלוס בין המספרים.","level":"support","canIntegrate":true},
      {"word":"חיסור","definition":"פעולה שבה מורידים מספר אחד ממספר אחר, למשל 9-2","example":"כדי לדעת כמה נשאר, עושים חיסור.","level":"support","canIntegrate":true},
      {"word":"שעון","definition":"מכשיר שמראה מה השעה","example":"על הקיר תלוי שעון עגול עם מחוגים.","level":"support","canIntegrate":true},
      {"word":"סרגל","definition":"פס ישר עם סימנים, שמודדים בו אורך ומותחים קווים","example":"מתחתי קו ישר עם סרגל.","level":"core","canIntegrate":true},
      {"word":"כפל","definition":"חיבור של אותו מספר כמה פעמים, למשל 3×4","example":"לוח כפל עוזר לפתור תרגילים מהר.","level":"core","canIntegrate":true},
      {"word":"חילוק","definition":"פעולה שבה מחלקים כמות לחלקים שווים, למשל 12:3","example":"בעזרת חילוק גילינו שכל ילד מקבל ארבע עוגיות.","level":"core","canIntegrate":true},
      {"word":"משולש","definition":"צורה עם שלוש צלעות ושלוש פינות","example":"פרוסת פיצה דומה לצורת משולש.","level":"core","canIntegrate":true},
      {"word":"ריבוע","definition":"צורה עם ארבע צלעות שוות וארבע פינות ישרות","example":"כל משבצת במחברת היא ריבוע קטן.","level":"core","canIntegrate":true},
      {"word":"מלבן","definition":"צורה עם ארבע פינות ישרות: שתי צלעות ארוכות ושתיים קצרות","example":"הדלת של הכיתה בצורת מלבן.","level":"core","canIntegrate":true},
      {"word":"עיגול","definition":"צורה עגולה בלי פינות, כמו גלגל","example":"ציירנו עיגול גדול על הלוח.","level":"core","canIntegrate":true},
      {"word":"סכום","definition":"התוצאה שמקבלים אחרי חיבור","example":"סכום הנקודות שלנו היה עשרים.","level":"core","canIntegrate":true},
      {"word":"מטר","definition":"יחידה למדידת אורך: מאה סנטימטרים","example":"אורך השולחן מטר אחד בדיוק.","level":"core","canIntegrate":true},
      {"word":"שבר","definition":"חלק משלם, למשל חצי או רבע","example":"חצי פיצה זה שבר: אחד חלקי שתיים.","level":"challenge","canIntegrate":true},
      {"word":"הפרש","definition":"התוצאה שמקבלים אחרי חיסור: בכמה מספר אחד גדול מהשני","example":"בין 10 ל־7 יש הפרש של שלוש.","level":"challenge","canIntegrate":true},
      {"word":"מכפלה","definition":"התוצאה שמקבלים אחרי כפל","example":"מכפלה של 2 ו־5 היא 10.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'cad72b5f-944a-513d-9cea-ae9f669f6e64', $t$כיתה ה׳ — מדע: ניסויים וטבע$t$,
    $t$מילות יסוד לשיעורי מדע וטכנולוגיה: צמחים, בעלי חיים, אנרגיה ושלבי הניסוי — מהשערה ועד מסקנה.$t$,
    'he', 'grade_5', 'science', 'LC-HE-G5-SCIENCE',
    $j$[
      {"word":"צמח","definition":"יצור חי שגדל באדמה, שותה מים ומשתמש באור השמש","example":"על אדן החלון גדל צמח נענע.","level":"support","canIntegrate":true},
      {"word":"זרע","definition":"החלק הקטן שממנו צומח צמח חדש","example":"שתלתי זרע של חמנייה בעציץ.","level":"support","canIntegrate":true},
      {"word":"שורש","definition":"החלק של הצמח שמתחת לאדמה, שסופג מים","example":"לעץ הזה יש שורש עבה וחזק.","level":"support","canIntegrate":true},
      {"word":"חרק","definition":"בעל חיים קטן עם שש רגליים, כמו נמלה או חיפושית","example":"מצאנו חרק ירוק על עלה החסה.","level":"support","canIntegrate":true},
      {"word":"מגנט","definition":"חפץ שמושך אליו ברזל","example":"הדבקתי ציור למקרר עם מגנט.","level":"core","canIntegrate":true},
      {"word":"ניסוי","definition":"בדיקה שעושים כדי לגלות אם רעיון נכון","example":"עשינו ניסוי: איזה כדור נופל מהר יותר?","level":"core","canIntegrate":true},
      {"word":"מעבדה","definition":"חדר עם כלים מיוחדים שבו חוקרים ועושים ניסויים","example":"בבית הספר יש מעבדה עם מיקרוסקופים.","level":"core","canIntegrate":true},
      {"word":"חשמל","definition":"אנרגיה שזורמת בחוטים ומפעילה מנורות ומכשירים","example":"בסערה הייתה הפסקת חשמל בכל השכונה.","level":"core","canIntegrate":true},
      {"word":"חמצן","definition":"גז שנמצא באוויר ושאנחנו צריכים כדי לנשום","example":"צמחים משחררים חמצן לאוויר.","level":"core","canIntegrate":true},
      {"word":"יונק","definition":"בעל חיים שהגורים שלו שותים חלב מגוף האם","example":"הלווייתן חי בים, אבל הוא יונק ולא דג.","level":"core","canIntegrate":true},
      {"word":"זוחל","definition":"בעל חיים עם קשקשים ודם קר, כמו לטאה או נחש","example":"הצב הוא זוחל שחי הרבה שנים.","level":"core","canIntegrate":true},
      {"word":"אנרגיה","definition":"הכוח שמאפשר לדברים לזוז, לגדול, להאיר או להתחמם","example":"ארוחת בוקר נותנת לגוף אנרגיה ליום כולו.","level":"core","canIntegrate":true},
      {"word":"תצפית","definition":"התבוננות זהירה ורישום של מה שרואים","example":"ערכנו תצפית על הציפורים בחצר ורשמנו כל אחת.","level":"challenge","canIntegrate":true},
      {"word":"השערה","definition":"ניחוש מנומק שבודקים בניסוי","example":"הייתה לי השערה שצמח בחושך לא יגדל.","level":"challenge","canIntegrate":true},
      {"word":"מסקנה","definition":"מה שמבינים בסוף הניסוי לפי התוצאות","example":"מסקנה חשובה מהניסוי: צמחים צריכים אור.","level":"challenge","canIntegrate":true},
      {"word":"אידוי","definition":"מה שקורה כשמים מתחממים והופכים לאדים","example":"בגלל אידוי השלולית נעלמה אחרי יום חם.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '4c9212f2-6c38-574f-b17e-746edd510f1e', $t$כיתה ז׳ — גאוגרפיה: נוף ומפה$t$,
    $t$מושגי יסוד לקריאת מפה ולתיאור נוף, עם דוגמאות מארץ ישראל: הנגב, הכרמל, הכנרת ועמק יזרעאל.$t$,
    'he', 'grade_7', 'geography', 'LC-HE-G7-GEO',
    $j$[
      {"word":"מפה","definition":"ציור של מקום מלמעלה, שמראה דרכים, ערים וגבולות","example":"פתחנו מפה כדי למצוא את השביל.","level":"support","canIntegrate":true},
      {"word":"צפון","definition":"הכיוון שאליו מצביעה מחט המצפן","example":"הרוח נשבה מכיוון צפון.","level":"support","canIntegrate":true},
      {"word":"דרום","definition":"הכיוון ההפוך לצפון","example":"חלונות הכיתה פונים לכיוון דרום.","level":"support","canIntegrate":true},
      {"word":"מדבר","definition":"אזור יבש מאוד, עם מעט גשם ומעט צמחים","example":"הנגב הוא מדבר שתופס חצי מהמדינה.","level":"support","canIntegrate":true},
      {"word":"אגם","definition":"גוף מים גדול שמוקף יבשה מכל הצדדים","example":"הכנרת היא אגם של מים מתוקים.","level":"core","canIntegrate":true},
      {"word":"נחל","definition":"מים שזורמים בערוץ, לפעמים רק בחורף","example":"אחרי הגשם זרם נחל במקום שהיה יבש.","level":"core","canIntegrate":true},
      {"word":"מעיין","definition":"מקום שבו מים יוצאים מתוך האדמה","example":"בסוף הטיול מצאנו מעיין קריר מתחת לסלעים.","level":"core","canIntegrate":true},
      {"word":"עמק","definition":"שטח נמוך ושטוח בין הרים או גבעות","example":"עמק יזרעאל מלא שדות ירוקים.","level":"core","canIntegrate":true},
      {"word":"מישור","definition":"שטח גדול ושטוח, בלי הרים","example":"לאורך החוף משתרע מישור רחב.","level":"core","canIntegrate":true},
      {"word":"רכס","definition":"שורה ארוכה של הרים מחוברים","example":"הכרמל הוא רכס שמשתרע עד הים.","level":"core","canIntegrate":true},
      {"word":"גבול","definition":"הקו שמפריד בין מדינה למדינה או בין שטח לשטח","example":"על המפה מסומן גבול בקו מקווקו.","level":"core","canIntegrate":true},
      {"word":"יבשת","definition":"אחד מגושי היבשה הגדולים בעולם, כמו אסיה או אפריקה","example":"אוסטרליה היא גם מדינה וגם יבשת.","level":"core","canIntegrate":true},
      {"word":"אקלים","definition":"מזג האוויר הרגיל באזור לאורך הרבה שנים","example":"בישראל יש אקלים חם ויבש בקיץ.","level":"challenge","canIntegrate":true},
      {"word":"מכתש","definition":"עמק עמוק וסגור שנוצר כשמים סחפו סלעים רכים במשך מיליוני שנים","example":"מכתש רמון הוא אחד המקומות המרשימים בנגב.","level":"challenge","canIntegrate":true},
      {"word":"אוקיינוס","definition":"גוף מים מלוח וענק, גדול מכל ים","example":"בין אמריקה לאירופה משתרע אוקיינוס ענק.","level":"challenge","canIntegrate":true},
      {"word":"אוכלוסייה","definition":"כל האנשים שגרים במקום מסוים","example":"לתל אביב יש אוכלוסייה גדולה וצפופה.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '8ea1698b-4232-5025-8551-1b3e702f3cd1', $t$כיתה י׳ — אזרחות: מושגי יסוד$t$,
    $t$המושגים שחוזרים בכל שיעור אזרחות: רוב ומיעוט, זכויות וחובות, רשויות השלטון והחוקה. הסברים מדויקים בשפה של תלמידי תיכון.$t$,
    'he', 'grade_10', 'history', 'LC-HE-G10-CIVICS',
    $j$[
      {"word":"רוב","definition":"יותר ממחצית מהקולות או מהאנשים","example":"להחלטה הזו היה רוב גדול בכיתה.","level":"support","canIntegrate":true},
      {"word":"מיעוט","definition":"קבוצה קטנה יותר בתוך חברה גדולה, או פחות ממחצית הקולות","example":"בדמוקרטיה גם מיעוט זכאי להשמיע את קולו.","level":"support","canIntegrate":true},
      {"word":"אזרח","definition":"אדם ששייך רשמית למדינה, ויש לו בה זכויות וחובות","example":"כל אזרח מגיל 18 יכול להצביע.","level":"support","canIntegrate":true},
      {"word":"חובה","definition":"דבר שחייבים לעשות לפי החוק או לפי המצפון","example":"בישראל לימודים הם חובה עד כיתה י״ב.","level":"support","canIntegrate":true},
      {"word":"בחירות","definition":"התהליך שבו אזרחים מצביעים ובוחרים את נציגיהם","example":"פעם בארבע שנים אמורות להתקיים בחירות לכנסת.","level":"core","canIntegrate":true},
      {"word":"כנסת","definition":"בית הנבחרים של מדינת ישראל, שבו מחוקקים חוקים","example":"כל כנסת נבחרת לארבע שנים ויש בה 120 חברים.","level":"core","canIntegrate":true},
      {"word":"ממשלה","definition":"קבוצת השרים שמנהלת את המדינה ומבצעת את ההחלטות","example":"אחרי הבחירות קמה ממשלה חדשה.","level":"core","canIntegrate":true},
      {"word":"חוקה","definition":"מסמך עליון שקובע את כללי היסוד של המדינה","example":"לישראל אין עדיין חוקה כתובה אחת, אלא חוקי יסוד.","level":"core","canIntegrate":true},
      {"word":"זכויות","definition":"מה שמגיע לכל אדם, כמו חופש ביטוי וחינוך","example":"לילדים יש זכויות שהחוק שומר עליהן.","level":"core","canIntegrate":true},
      {"word":"שלטון","definition":"מי שמנהל את המדינה ומקבל החלטות בשמה","example":"בדמוקרטיה, שלטון מתחלף בבחירות חופשיות.","level":"core","canIntegrate":true},
      {"word":"סמכות","definition":"הזכות והכוח הרשמי לקבל החלטות","example":"למנהלת יש סמכות לקבוע את מערכת השעות.","level":"core","canIntegrate":true},
      {"word":"מחאה","definition":"פעולה של אנשים שמביעים בפומבי שהם לא מסכימים","example":"התלמידים ארגנו מחאה שקטה נגד כריתת העצים.","level":"core","canIntegrate":true},
      {"word":"דמוקרטיה","definition":"שיטת שלטון שבה העם בוחר את מנהיגיו בבחירות חופשיות","example":"דמוקרטיה נשענת על בחירות, חופש ביטוי ושלטון החוק.","level":"challenge","canIntegrate":true},
      {"word":"ריבונות","definition":"השליטה המלאה של מדינה על השטח שלה ועל ההחלטות שלה","example":"לכל מדינה עצמאית יש ריבונות בתוך גבולותיה.","level":"challenge","canIntegrate":true},
      {"word":"חקיקה","definition":"התהליך של כתיבת חוקים ואישורם","example":"חקיקה של חוק חדש עוברת שלוש קריאות בכנסת.","level":"challenge","canIntegrate":true},
      {"word":"ביקורת","definition":"בדיקה של פעולות השלטון כדי לחשוף טעויות ולמנוע שחיתות","example":"עיתונות חופשית מפעילה ביקורת על הממשלה.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  grade_level = EXCLUDED.grade_level,
  subject = EXCLUDED.subject,
  curriculum_standard = EXCLUDED.curriculum_standard,
  words = EXCLUDED.words,
  is_active = TRUE;
