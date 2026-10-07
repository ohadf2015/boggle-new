-- Curriculum word lists v2 (ru): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/ru-upper-b.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '9a1cae48-83a3-532e-8067-ecc505b6323c', $t$7 класс — Сила и движение$t$,
    $t$Слова из физики о силе, движении и веществе. Каждое слово с понятным объяснением и примером из повседневной жизни.$t$,
    'ru', 'grade_7', 'science', 'LC-RU-G7-PHYSICS',
    $j$[
      {"word":"сила","definition":"Действие одного тела на другое, которое меняет его движение","example":"Сильная сила толкнула тележку вперёд.","level":"support","canIntegrate":true},
      {"word":"тело","definition":"Всё, что занимает место в пространстве и имеет массу","example":"Каждое тело падает на землю, если его отпустить.","level":"support","canIntegrate":true},
      {"word":"вес","definition":"Сила, с которой предмет давит на опору или подвес","example":"Вес камня больше, чем вес пера.","level":"support","canIntegrate":true},
      {"word":"путь","definition":"Длина линии, по которой движется тело","example":"Путь от дома до школы около километра.","level":"support","canIntegrate":true},
      {"word":"скорость","definition":"Величина, которая показывает, как быстро тело проходит путь","example":"Скорость поезда была очень большой.","level":"core","canIntegrate":true},
      {"word":"энергия","definition":"Способность совершать работу или вызывать изменения","example":"Солнечная энергия греет нашу планету.","level":"core","canIntegrate":true},
      {"word":"давление","definition":"Сила, действующая на единицу площади поверхности","example":"Давление воздуха в шине нужно проверять.","level":"core","canIntegrate":true},
      {"word":"плотность","definition":"Масса вещества в единице объёма","example":"Плотность железа больше, чем плотность дерева.","level":"core","canIntegrate":true},
      {"word":"трение","definition":"Сила, которая мешает телам скользить друг по другу","example":"Трение помогает нам не падать на льду.","level":"core","canIntegrate":true},
      {"word":"рычаг","definition":"Твёрдый стержень, который вращается вокруг опоры","example":"Рычаг помогает поднять тяжёлый камень.","level":"core","canIntegrate":true},
      {"word":"магнит","definition":"Тело, которое притягивает железо и некоторые металлы","example":"Магнит прилип к холодильнику.","level":"core","canIntegrate":true},
      {"word":"инерция","definition":"Свойство тел сохранять скорость, пока на них не действуют силы","example":"Инерция не даёт телу сразу остановиться.","level":"core","canIntegrate":true},
      {"word":"батарея","definition":"Источник тока, который запасает энергию для прибора","example":"Батарея в пульте села.","level":"core","canIntegrate":true},
      {"word":"ускорение","definition":"Быстрота изменения скорости","example":"Машина показала большое ускорение на старте.","level":"challenge","canIntegrate":true},
      {"word":"гравитация","definition":"Сила притяжения между всеми телами, в том числе к Земле","example":"Гравитация тянет яблоко к земле.","level":"challenge","canIntegrate":true},
      {"word":"импульс","definition":"Произведение массы тела на его скорость","example":"Импульс мяча изменился, когда его поймали.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '7c766558-052f-5d3f-8b5f-6bad1e65c951', $t$9 класс — Государство и закон$t$,
    $t$Слова об обществе, законах и власти: что такое конституция, выборы и парламент. Каждое слово с понятным объяснением и предложением о реальной ситуации.$t$,
    'ru', 'grade_9', 'history', 'LC-RU-G9-STATE',
    $j$[
      {"word":"закон","definition":"Правило, которое обязаны соблюдать все жители страны","example":"Закон запрещает брать чужие вещи.","level":"support","canIntegrate":true},
      {"word":"народ","definition":"Большая группа людей, которые живут вместе и имеют общую историю","example":"Народ собрался на площади на праздник.","level":"support","canIntegrate":true},
      {"word":"гражданин","definition":"Человек, который состоит в стране и имеет её права","example":"Каждый гражданин имеет право на защиту.","level":"support","canIntegrate":true},
      {"word":"государство","definition":"Организация людей на определённой территории с властью и законами","example":"Государство строит новые школы.","level":"support","canIntegrate":true},
      {"word":"демократия","definition":"Строй, в котором власть принадлежит народу, а руководителей выбирают","example":"Демократия дает людям право выбирать власть.","level":"core","canIntegrate":true},
      {"word":"республика","definition":"Страна, где главу государства выбирают, а не наследуют","example":"Республика выбирает своих руководителей на выборах.","level":"core","canIntegrate":true},
      {"word":"конституция","definition":"Главный закон страны, который определяет устройство государства","example":"Конституция защищает права каждого человека.","level":"core","canIntegrate":true},
      {"word":"поправка","definition":"Изменение, которое вносят в закон или в конституцию","example":"Поправка дала людям право голоса.","level":"core","canIntegrate":true},
      {"word":"договор","definition":"Соглашение между двумя или более странами или людьми","example":"Две страны подписали мирный договор.","level":"core","canIntegrate":true},
      {"word":"колония","definition":"Территория, которой управляет другая страна","example":"Колония долго боролась за свободу.","level":"core","canIntegrate":true},
      {"word":"революция","definition":"Резкое и глубокое изменение власти, часто силой","example":"Революция изменила законы страны.","level":"core","canIntegrate":true},
      {"word":"перепись","definition":"Официальный подсчёт всех жителей страны","example":"Перепись показала, сколько людей живёт в городе.","level":"core","canIntegrate":true},
      {"word":"парламент","definition":"Собрание, которое принимает законы","example":"Парламент обсудил новый закон.","level":"core","canIntegrate":true},
      {"word":"суверенитет","definition":"Право страны самостоятельно управлять собой","example":"Страна защищает свой суверенитет.","level":"challenge","canIntegrate":true},
      {"word":"ратификация","definition":"Официальное одобрение договора или конституции","example":"Ратификация договора заняла несколько месяцев.","level":"challenge","canIntegrate":true},
      {"word":"вето","definition":"Право руководителя запретить принятие закона","example":"Президент наложил вето на закон.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'dba7fb90-701e-5b4f-bb5d-d2edb75bd20f', $t$11 класс — Слова для характера и доводов$t$,
    $t$Точные слова для описания характера, спора и мышления. Каждое слово с ясным определением и предложением, которое показывает, как его употреблять.$t$,
    'ru', 'grade_11', 'general', 'LC-RU-G11-WORDS',
    $j$[
      {"word":"честный","definition":"Говорящий правду и ничего не скрывающий","example":"Честный ответ лучше красивой лжи.","level":"support","canIntegrate":true},
      {"word":"спокойный","definition":"Расслабленный и не взволнованный даже в трудной ситуации","example":"Спокойный пилот не растерялся во время бури.","level":"support","canIntegrate":true},
      {"word":"внимательный","definition":"Старательно следящий за деталями и не допускающий ошибок","example":"Внимательный водитель объехал яму.","level":"support","canIntegrate":true},
      {"word":"краткий","definition":"Недолгий по времени или короткий по размеру","example":"Краткий отчёт занял одну страницу.","level":"support","canIntegrate":true},
      {"word":"откровенный","definition":"Прямо и открыто высказывающий мнение, даже неприятное","example":"Откровенный отзыв помог мне исправить ошибки.","level":"core","canIntegrate":true},
      {"word":"образный","definition":"Яркий и живой, так что его легко представить","example":"Образный рассказ помог нам увидеть всю картину.","level":"core","canIntegrate":true},
      {"word":"практичный","definition":"Решающий задачи реалистично и без лишних затрат","example":"Команда выбрала практичный план вместо идеального.","level":"core","canIntegrate":true},
      {"word":"стойкий","definition":"Быстро восстанавливающийся после трудностей","example":"Стойкий спортсмен не сдался после поражения.","level":"core","canIntegrate":true},
      {"word":"скептичный","definition":"Сомневающийся в чём-то, пока нет доказательств","example":"Скептичный судья не поверил свидетелю.","level":"core","canIntegrate":true},
      {"word":"тщательный","definition":"Очень внимательный к каждой мелочи","example":"Тщательный инженер проверил каждое измерение.","level":"core","canIntegrate":true},
      {"word":"убедительный","definition":"Способный заставить других поверить или сделать что-то","example":"Убедительный довод изменил мнение всех.","level":"core","canIntegrate":true},
      {"word":"неохотный","definition":"Не желающий что-то делать и колеблющийся","example":"Неохотный ученик долго не начинал писать.","level":"core","canIntegrate":true},
      {"word":"лаконичный","definition":"Выражающий многое немногими словами","example":"Лаконичный ответ был точен и ясен.","level":"core","canIntegrate":true},
      {"word":"великодушный","definition":"Готовый простить и помочь другим, ничего не требуя взамен","example":"Великодушный сосед помог донести сумки.","level":"challenge","canIntegrate":true},
      {"word":"вездесущий","definition":"Присутствующий везде одновременно","example":"Вездесущий телефон есть у каждого.","level":"challenge","canIntegrate":true},
      {"word":"ясный","definition":"Понятный по смыслу, в котором ничего не запутано","example":"Ясный ответ помог всем понять задачу.","level":"challenge","canIntegrate":true}
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
