import { describe, it, expect } from 'vitest';
import { esFirstSenseFlagged, esSenses, rejectNounClueEs, rejectNounClueRu, rejectLemmaClueRu, ruClueSenses, ruLemmaSenses, ruNounSenses } from '../nounClueFilter';

describe('rejectNounClueEs', () => {
  it.each([
    ['digit', 'Tosco, sin pulimento, naturalmente basto2'],
    ['digit mid', 'Tono de azul, entre los 487 y los 505 nm'],
    ['usage formula', 'Se usa también como interjección para dar fuerza a la amenaza'],
    ['usage formula past', 'Se usaba para llamar a uno que estuviese distante'],
    ['denota', 'Denota advertencia'],
    ['genital', 'Órgano genital del hombre'],
    ['sexual', 'Relativo al acto sexual'],
    ['vulgar', 'Vulgar: persona torpe'],
    ['drugs', 'Cigarrillo de marihuana u otras drogas'],
    ['country', 'Arbusto de Cuba, Ecuador y México'],
    ['region', 'Originario, relativo a, o propio de Aragón'],
    ['region ending in an accented vowel', 'Fruta típica del Perú'],
    ['archaic', 'Moneda de oro antigua'],
    ['desusado', 'Pieza desusada de armadura'],
    ['taxonomy', 'Especie de criba grande'],
    ['taxonomy plant', 'Planta de la familia de las rosáceas'],
    ['taxonomy shrub', 'Arbusto anacardiáceo'],
    ['body part', 'Órgano eréctil que presenta el macho de los vertebrados'],
    ['digestive', 'Extremo terminal del tubo digestivo'],
    ['alcohol', 'Intoxicación producido por la ingesta de alcohol'],
    ['disease', 'Enfermedad cutánea caracterizada por la formación de tumores'],
    ['wiki markup', '==== Sustantivo masculino y plural ===='],
    ['stray space punctuation', "Letra del alfabeto griego , equivalente a la 'I'"],
    ['colloquial', 'No me importa'],
    ['bird', 'Garrapatero asurcado'],
    ['sense extension opener', 'Por extensión, rígido, que no se puede doblar fácilmente'],
    ['anaphora tal', 'Golpe dado con una pieza tal'],
    ['anaphora este', 'Distancia recorrida al hacer este movimiento'],
    ['anaphora estos', 'Conjunto o masa de estos filamentos'],
    ['anaphora otras', 'Sumo jerarca en algunas otras confesiones cristianas'],
    ['ordinal sense of a cardinal', 'Que ocupa el décimo lugar en una serie'],
  ])('rejects %s', (_n, clue) => {
    expect(rejectNounClueEs(clue)).toBe(true);
  });

  it.each([
    'Postre preparado con yemas de huevo, leche y azúcar',
    'Interior del pan',
    'Pez marino comestible',
    'Parte inferior de un cuerpo que le sirve de soporte',
    'Asunto del que trata un discurso o escrito',
  ])('keeps %s', (clue) => {
    expect(rejectNounClueEs(clue)).toBe(false);
  });
});

describe('rejectNounClueRu', () => {
  it.each([
    ['inflected form', 'форма родительного падежа единственного числа существительного год'],
    ['case mention', 'Именительный падеж множественного числа'],
    ['pronoun', 'Личное местоимение третьего лица'],
    ['conjunction', 'Союз, служит для соединения однородных членов'],
    ['particle', 'Частица, выражающая отрицание'],
    ['usage formula', 'Употребляется для обозначения вопроса'],
    ['points to', 'Указывает на предмет речи'],
    ['proper name', 'Мужское имя'],
    ['archaic label', 'устар. мера длины'],
    ['dialect label', 'диал. то же, что изба'],
    ['obscene label', 'обсц. половой член'],
    ['colloquial label', 'разг. молодой человек'],
    ['sexual', 'Половое сношение'],
    ['drugs', 'Наркотическое вещество из конопли'],
    ['alcohol', 'Крепкий алкогольный напиток'],
    ['region', 'В Сибири: деревянный дом'],
    ['taxonomy genus', 'Род растений семейства лютиковых'],
    ['taxonomy species', 'Вид рыб семейства карповых'],
    ['digit', 'Единица измерения, равная 1000 метров'],
    ['latin', 'Домашний кот (лат. Felis catus)'],
    ['slang label after another label', 'перен., жарг. тюрьма'],
    ['anaphora to a previous sense', 'Здание этого учреждения'],
    ['anaphora such', 'Результат такого действия'],
    ['vague figurative opener', 'То, что приносит вред'],
    ['vague something', 'Нечто несбыточное, неправдоподобное'],
    ['context-only opener', 'В восточных единоборствах'],
    ['context prefix', 'В живописи: изображения с бытовым сюжетом'],
    ['stray space before comma', 'Сила, жизненная сила , нечто живительное'],
  ])('rejects %s', (_n, clue) => {
    expect(rejectNounClueRu(clue)).toBe(true);
  });

  it.each([
    'Самец домашней кошки',
    'Линия границы между водой и сушей',
    'Орган зрения человека или животного',
    'Небольшое озеро',
    'часть суток от восхода до заката (примерно от 12 до 18 часов)',
  ])('keeps %s', (clue) => {
    expect(rejectNounClueRu(clue)).toBe(false);
  });
});

describe('ruNounSenses', () => {
  const page = (pos: string, sense: string) =>
    `= Русский =\n\n\n=== Морфологические и синтаксические свойства ===\nкот\n${pos}\nКорень: -кот-.\n\n\n==== Значение ====\n${sense} ◆ пример\nвторое значение\n`;

  it('returns the raw first sense (labels kept) when the first part of speech is a noun', () => {
    expect(ruNounSenses(page('Существительное, одушевлённое, мужской род', 'зоол. самец домашней кошки'))[0]).toBe('зоол. самец домашней кошки');
  });

  it('is null for verbs, pronouns and other parts of speech', () => {
    expect(ruNounSenses(page('Глагол, несовершенный вид', 'двигаться'))).toEqual([]);
    expect(ruNounSenses(page('Местоимение, личное', 'третье лицо'))).toEqual([]);
  });

  it('judges the part of speech by the morphology block, not a later homonym', () => {
    expect(ruNounSenses(page('Местоименное прилагательное, тип склонения <2*b>.\nСуществительное позже', 'целый, полный'))).toEqual([]);
    expect(ruNounSenses('= Русский =\n=== Морфологические и синтаксические свойства ===\nЗвукоподражательное слово.\n==== Значение ====\nзвук удара')).toEqual([]);
  });

  it('strips stress marks from the sense', () => {
    expect(ruNounSenses(page('Существительное, неодушевлённое', 'пищевой продукт, выпекаемый из муки\u0301'))[0]).toBe('пищевой продукт, выпекаемый из муки');
  });

  it('is null for inflected-form pages that have no morphology block', () => {
    expect(ruNounSenses('= Русский =\nго́-да МФА: [ˈɡodə]\nформа родительного падежа единственного числа существительного год ◆ x')).toEqual([]);
  });

  it('returns up to two senses in order, each cut before its examples', () => {
    expect(ruNounSenses(page('Существительное, неодушевлённое', 'первое ◆ пример\nвторое\nтретье'))).toEqual(['первое', 'второе']);
  });

  it('drops stub senses that Wiktionary has no usage example for (obscure entries such as гор = a calendar month)', () => {
    expect(ruNounSenses(page('Существительное, неодушевлённое', 'второй месяц календаря ◆ Отсутствует пример употребления (см. рекомендации).\nгорная вершина'))[0]).toBe('горная вершина');
  });

  it('skips a sense-group heading line and returns the first real sense', () => {
    expect(ruNounSenses(page('Существительное, неодушевлённое', 'Общее прототипическое значение — влага.\nпрозрачная жидкость без цвета и запаха'))[0]).toBe('прозрачная жидкость без цвета и запаха');
  });

  it('is null without a Russian section', () => {
    expect(ruNounSenses('= Украинский =\n=== Значение ===\nкіт')).toEqual([]);
    expect(ruNounSenses(null)).toEqual([]);
  });
});

describe('esFirstSenseFlagged', () => {
  const page = (meta: string) =>
    `== Español ==\n=== Etimología 1 ===\n==== Sustantivo femenino ====\ncura ¦ plural: curas\n1\nAcción o efecto de cuidar.\n${meta}\nSinónimos: cuidado.\n2\nCondición de curador.\nUso: coloquial.\n==== Locuciones ====\n`;

  it.each([
    ['archaic', 'Uso: anticuado.'],
    ['disused', 'Uso: desusado.'],
    ['vulgar', 'Uso: vulgar, malsonante.'],
    ['regional', 'Ámbito: Argentina, Uruguay.'],
  ])('flags a first sense marked %s', (_n, meta) => {
    expect(esFirstSenseFlagged(page(meta))).toBe(true);
  });

  it('ignores neutral usage notes and labels on later senses', () => {
    expect(esFirstSenseFlagged(page('Uso: úsase más en plural.'))).toBe(false);
    expect(esFirstSenseFlagged(page(''))).toBe(false);
  });

  it('checks the first sense under a topic label line ("1 Medicina")', () => {
    expect(esFirstSenseFlagged('== Español ==\n==== Sustantivo masculino ====\n1 Perros\nVariedad doméstica del lobo.\nUso: anticuado.\n')).toBe(true);
  });
});

describe('esSenses', () => {
  const page = `== Español ==\n==== Sustantivo masculino ====\nabad ¦ plural: abades\n1 Religión\nSuperior de una abadía.\nSinónimos: prior.\n2\nCura de algunas iglesias.\nUso: anticuado.\n3\nTítulo de dignidad.\n4\nCuarto.\n==== Locuciones ====\nx\n`;

  it('returns the glosses of the first two unflagged senses of the first part of speech', () => {
    expect(esSenses(page)).toEqual(['Superior de una abadía.', 'Título de dignidad.']);
  });

  it('is empty without a Spanish section', () => {
    expect(esSenses('== Catalán ==\n==== Sustantivo ====\n1\nx')).toEqual([]);
  });
});

const ruPage = (lines: string[]) => ['= Русский =', '', '=== Морфологические и синтаксические свойства ===', ...lines].join('\n');
const ADJ_ALYJ = ruPage(['а́·лый', 'Прилагательное, качественное, тип склонения по классификации А. Зализняка — 1a\'. Сравнительная степень — але́е, але́й.', '==== Значение ====', 'ярко-красный ◆ Алые розы.    ◆ Алый мак.    ◆ Алая кровь.   ']);
const VERB_BEGAT = ruPage(['бе́-гать (дореформ. бѣ́гать)', 'Глагол, несовершенный вид,  непереходный,    тип спряжения по классификации А. Зализняка — 1a.      Соответствующего глагола совершенного вида нет.', 'Непроизводное.', '==== Значение ====', 'быстро перемещаться, отталкиваясь ногами от земли и в некоторые моменты не касаясь земли вовсе (о движении, совершаемом неоднократно или не в определённом направлении, в отличие от сходного по смыслу гл. бежать) ◆ Отсутствует пример употребления (см. рекомендации).   ', 'спорт. заниматься беговыми видами спорта ◆ Он бегает на средние дистанции.    ◆ Надо бы бегать начать.   ']);
const ADV_BEGLO = ruPage(['бе́г-ло', 'Наречие; неизменяемое. ', 'Корень: -бег-; суффиксы: -л-о.   ', '==== Значение ====', 'свободно, без затруднений ◆ Лет восьми нас стали учить грамоте; я через несколько месяцев бегло читал псалтырь.', 'не останавливаясь на подробностях; в общих чертах ◆ Но мы, бегло взглянув на них.']);
const PRON_EGO = ruPage(['е·го́', 'Местоимение, притяжательное, третьего лица.', 'Производное: ??.', '==== Значение ====', 'принадлежащий или относящийся к тому, что выражено третьим лицом мужского или среднего ро́да ◆ Отсутствует пример употребления (см. рекомендации).   ']);
const DEEPR_BOLTAYA = ruPage(['бол-та́·я', 'Невозвратное деепричастие, несовершенного вида, настоящего времени; неизменяемое. ', '', '==== Значение ====', 'дееприч.  от болтать ◆ Не знаю, как уж там устроились Спиваков с Ковалевским.']);

describe('ruLemmaSenses', () => {
  it('returns senses for an accepted adjective, verb or adverb lemma', () => {
    expect(ruLemmaSenses(ADJ_ALYJ, 'алый')[0]).toBe('ярко-красный');
    expect(ruLemmaSenses(VERB_BEGAT, 'бегать')[0]).toBe('спорт. заниматься беговыми видами спорта');
    expect(ruLemmaSenses(ADV_BEGLO, 'бегло')).toEqual(['свободно, без затруднений', 'не останавливаясь на подробностях; в общих чертах']);
  });

  it('keeps pronouns only when a usable sense is left', () => {
    expect(ruLemmaSenses(PRON_EGO, 'его')).toEqual([]);
  });

  it('rejects participle-like forms (деепричастие) by part of speech', () => {
    expect(ruLemmaSenses(DEEPR_BOLTAYA, 'болтая')).toEqual([]);
  });

  it('rejects an inflected adjective whose page is the form itself (ending is not the masculine lemma)', () => {
    expect(ruLemmaSenses(ADJ_ALYJ, 'алого')).toEqual([]);
  });

  it('rejects a verb that is not an infinitive', () => {
    expect(ruLemmaSenses(VERB_BEGAT, 'бегает')).toEqual([]);
  });

  it('does not change the noun path: nouns are not lemma-sensed', () => {
    expect(ruLemmaSenses(ruPage(['а·га́р', 'Существительное, неодушевлённое, мужской род.', '==== Значение ====', 'ботан. вид водорослей ◆ Пример.']), 'агар')).toEqual([]);
  });
});

describe('ruClueSenses', () => {
  it('uses the noun senses for nouns and the lemma senses otherwise', () => {
    expect(ruClueSenses(ruPage(['а·га́р', 'Существительное, неодушевлённое, мужской род.', '==== Значение ====', 'ботан. вид водорослей ◆ Пример.']), 'агар')).toEqual(['ботан. вид водорослей']);
    expect(ruClueSenses(ADV_BEGLO, 'бегло')[0]).toBe('свободно, без затруднений');
  });
});

describe('rejectLemmaClueRu', () => {
  it.each([
    ['anaphoric opener', 'Также без дополнения приступить к какому-либо действию'],
    ['part-of-speech label opener', 'Наречие другим способом'],
    ['grammar-only gloss', 'Образует сравнительную степень'],
    ['topic opener', 'О способе передвижения'],
    ['topic opener with truncated tail', 'О ком-чём и без доп'],
    ['truncated abbreviation tail', 'Когда, где и без доп'],
    ['pronoun label tail', 'Указательное мест'],
    ['question gloss', 'Вопросительное наречие в какое время?'],
  ])('rejects %s', (_, clue) => {
    expect(rejectLemmaClueRu(clue)).toBe(true);
  });

  it.each([
    ['plain gloss', 'Свободно, без затруднений'],
    ['gloss with a preposition', 'В некоторых, отдельных случаях'],
    ['gloss with a number', 'Целое число между пятью и семью'],
  ])('keeps %s', (_, clue) => {
    expect(rejectLemmaClueRu(clue)).toBe(false);
  });
});
