import { describe, it, expect } from 'vitest';
import { rejectNounClueEs } from '../nounClueFilter';

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
  ])('rejects %s', (_n, clue) => {
    expect(rejectNounClueEs(clue)).toBe(true);
  });

  it.each([
    'Postre preparado con yemas de huevo, leche y azúcar',
    'Interior del pan',
    'Pez marino comestible',
    'Parte inferior de un cuerpo que le sirve de soporte',
  ])('keeps %s', (clue) => {
    expect(rejectNounClueEs(clue)).toBe(false);
  });
});
