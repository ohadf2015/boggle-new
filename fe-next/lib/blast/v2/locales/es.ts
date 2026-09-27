import type { LocaleConfig, ThemeDef } from '../locale-config';
import type { ThemeKey } from '../types';
import { bonusDictLoaders } from '../bonus-dict-loaders';

const TILE_POOL_ES = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

const ACCENT_MAP: Record<string, string> = {
  'Á': 'A', 'á': 'A',
  'É': 'E', 'é': 'E',
  'Í': 'I', 'í': 'I',
  'Ó': 'O', 'ó': 'O',
  'Ú': 'U', 'ú': 'U',
  'Ü': 'U', 'ü': 'U',
};

// Precompiled once — avoids recompiling a RegExp on every normalize() call.
const ACCENT_REPLACERS: ReadonlyArray<readonly [RegExp, string]> =
  Object.entries(ACCENT_MAP).map(
    ([accented, base]) => [new RegExp(accented, 'g'), base] as const
  );

// Spanish corpus letter frequencies
const LETTER_FREQ_ES: Record<string, number> = {
  'E': 0.137, 'A': 0.124, 'O': 0.087, 'S': 0.074, 'R': 0.069,
  'I': 0.062, 'D': 0.060, 'T': 0.059, 'N': 0.056, 'C': 0.045,
  'L': 0.043, 'U': 0.040, 'M': 0.030, 'P': 0.028, 'B': 0.015,
  'G': 0.014, 'V': 0.010, 'Y': 0.009, 'Ñ': 0.008, 'F': 0.007,
  'H': 0.007, 'Q': 0.010, 'J': 0.004, 'Z': 0.005, 'X': 0.001,
  'K': 0.002, 'W': 0.002,
};

const T = (key: ThemeKey, words: string[]): ThemeDef => ({
  key, displayKey: `blast.themes.${key}`, wordPool: words,
});

const THEMES_ES: Record<ThemeKey, ThemeDef> = {
  onboarding: T('onboarding', ['GATO', 'SOL', 'HUEVO', 'CASA', 'PAN']),
  fruits: T('fruits', ['MANZANA', 'NARANJA', 'UVA', 'PERA', 'KIWI', 'FRESA', 'LIMON', 'MANGO', 'MELON']),
  animals: T('animals', ['LEÓN', 'OSO', 'LOBO', 'PERRO', 'PATO', 'RANA', 'TIGRE', 'ZORRO', 'VACA', 'GATO']),
  food: T('food', ['PAN', 'ARROZ', 'SOPA', 'PASTEL', 'QUESO', 'CARNE', 'FRUTA', 'LECHE', 'MIEL']),
  ocean: T('ocean', ['OLA', 'PEZ', 'CONCHA', 'MAR', 'CORAL', 'FOCA', 'ALGA', 'BARCO', 'BALLENA']),
  space: T('space', ['LUNA', 'SOL', 'PLANETA', 'COMETA', 'NAVE', 'MARTE', 'CIELO', 'ORBITA', 'GALAXIA']),
  nature: T('nature', ['ÁRBOL', 'HOJA', 'RÍO', 'PIEDRA', 'FLOR', 'MONTE', 'BOSQUE', 'LAGO', 'PLANTA', 'RAMA']),
  sports: T('sports', ['PELOTA', 'CORRER']),
  colors: T('colors', ['ROJO', 'AZUL', 'VERDE', 'ROSA', 'GRIS', 'NEGRO']),
  transport: T('transport', ['COCHE', 'TREN', 'BARCO', 'MOTO', 'CAMION', 'METRO', 'TAXI', 'AVIÓN']),
  body: T('body', ['MANO', 'PIERNA', 'OJO']),
  home: T('home', ['CASA', 'PUERTA', 'SILLA', 'MESA', 'CAMA', 'LAMPARA', 'COCINA', 'SOFA']),
  school: T('school', ['LIBRO', 'CLASE', 'LAPIZ', 'REGLA', 'PAPEL', 'TIZA', 'GOMA', 'MAPA']),
  tools: T('tools', ['MARTILLO', 'SIERRA']),
  weather: T('weather', ['LLUVIA', 'NIEVE', 'VIENTO', 'NUBE', 'HIELO', 'RAYO', 'NIEBLA', 'SOL']),
  music: T('music', ['TAMBOR', 'CANCION', 'PIANO', 'FLAUTA', 'NOTA', 'RITMO', 'VIOLIN', 'CORO']),
  jobs: T('jobs', ['COCINERO', 'ENFERMERA']),
  family: T('family', ['MAMÁ', 'PAPÁ']),
  numbers: T('numbers', ['UNO', 'DOS', 'DOCE']),
  feelings: T('feelings', ['FELIZ', 'TRISTE']),
  mythology: T('mythology', ['DRAGON', 'HEROE', 'DIOSA', 'NINFA', 'OGRO', 'SIRENA', 'TITAN', 'MITO']),
  science: T('science', ['ATOMO', 'CELULA', 'ENERGIA', 'IMAN', 'GAS', 'ACIDO', 'LASER', 'ROBOT', 'FOSIL']),
  travel: T('travel', ['MAPA', 'TIENDA']),
  art: T('art', ['PINTURA', 'ARTE']),
  time: T('time', ['DÍA', 'SEMANA']),
  joy: T('joy', ['ALEGRE', 'FELIZ', 'RISA', 'AMOR', 'PAZ', 'SONRISA', 'BAILE', 'FIESTA']),
  cozy: T('cozy', ['CALMA', 'SUAVE', 'TIBIO', 'SUEÑO', 'MANTA', 'HOGAR', 'TAZA', 'LANA']),
  spooky: T('spooky', ['MIEDO', 'BRUJA', 'NOCHE', 'OSCURO', 'ARANA', 'HUESO', 'TUMBA', 'MASCARA']),
  magic: T('magic', ['MAGIA', 'HADA', 'GENIO', 'ELFO', 'POCION', 'VARITA', 'MAGO', 'HECHIZO']),
  adventure: T('adventure', ['MAPA', 'VIAJE', 'TIENDA', 'RIO', 'MONTAÑA', 'SENDA', 'CUEVA', 'BOSQUE']),
};

export const ES_CONFIG: LocaleConfig = {
  locale: 'es',
  rtl: false,
  normalize: (s) => {
    let out = s.toUpperCase();
    for (const [pattern, base] of ACCENT_REPLACERS) {
      out = out.replace(pattern, base);
    }
    return out;
  },
  displayChar: (c) => c,
  letterFrequency: LETTER_FREQ_ES,
  tilePool: TILE_POOL_ES,
  wordLengthRange: { min: 3, max: 7 },
  themes: THEMES_ES,
  bonusDictionary: bonusDictLoaders.es,
  fontStack: 'Fredoka, Rubik, system-ui',
  tileExtraPadding: 2,
};
