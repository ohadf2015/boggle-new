// Seed vetted council-authored native puzzles for es / sv / ja into the DB.
// es + sv are playable on the A–Z keyboard (NFD diacritic folding in
// canonicalize) → is_active=true. ja is kanji-only → is_active=false until a
// Japanese IME input path exists (the on-screen keyboard can't type kanji).
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

// --- Vetted Spanish (open/closed compounds, everyday vocab, gender-safe) ---
const ES = [
  ['e', 'pasa', 'tiempo', 'libre', 'Pasatiempo + tiempo libre', 'Hobby o momento de ocio'],
  ['e', 'cumple', 'años', 'luz', 'Cumpleaños + años luz', 'Unidades de tiempo y de distancia'],
  ['e', 'video', 'juego', 'mesa', 'Videojuego + juego de mesa', 'Diversión digital o con tablero'],
  ['e', 'auto', 'pista', 'aterrizaje', 'Autopista + pista de aterrizaje', 'Por donde van coches o aviones'],
  ['e', 'balón', 'mano', 'dura', 'Balonmano + mano dura', 'Un deporte y una actitud severa'],
  ['e', 'ferro', 'carril', 'bici', 'Ferrocarril + carril bici', 'Vía para trenes y para ciclistas'],
  ['e', 'corta', 'uñas', 'gel', 'Cortauñas + uñas de gel', 'Útil de manicura'],
  ['e', 'abre', 'latas', 'cerveza', 'Abrelatas + latas de cerveza', 'Abridor de cocina'],
  ['e', 'sobre', 'mesa', 'redonda', 'Sobremesa + mesa redonda', 'Charla tras comer, o un mueble'],
  ['m', 'rompe', 'cabezas', 'familia', 'Rompecabezas + cabeza de familia', 'Juego de piezas'],
  ['m', 'lava', 'manos', 'obra', 'Lavamanos + mano de obra', 'Donde te lavas en el baño'],
  ['m', 'saca', 'corchos', 'vino', 'Sacacorchos + corchos de vino', 'Para abrir botellas'],
  ['m', 'media', 'noche', 'vieja', 'Medianoche + Nochevieja', 'Las doce, y el fin de año'],
  ['m', 'corta', 'fuegos', 'artificiales', 'Cortafuegos + fuegos artificiales', 'Barrera contra incendios'],
  ['m', 'boca', 'calle', 'cortada', 'Bocacalle + calle cortada', 'Entrada de una vía'],
  ['m', 'saca', 'puntas', 'pie', 'Sacapuntas + puntapié', 'Útil escolar, o un golpe con el pie'],
];

// --- Vetted Swedish (real closed compounds, verified both sides) ---
const SV = [
  ['e', 'fot', 'boll', 'plan', 'Fotboll + bollplan', 'Sveriges populäraste sport'],
  ['e', 'sol', 'ros', 'blad', 'Solros + rosblad', 'En stor gul blomma'],
  ['e', 'glass', 'bil', 'väg', 'Glassbil + bilväg', 'Kommer med musik på sommaren'],
  ['e', 'sjö', 'stjärna', 'himmel', 'Sjöstjärna + stjärnhimmel', 'Finns i havet och i rymden'],
  ['e', 'hus', 'tak', 'lampa', 'Hustak + taklampa', 'Högsta delen på en byggnad'],
  ['e', 'vägg', 'klocka', 'radio', 'Väggklocka + klockradio', 'Håller koll på tiden'],
  ['e', 'flod', 'häst', 'sko', 'Flodhäst + hästsko', 'Stort djur i floden'],
  ['e', 'sjuk', 'hus', 'läkare', 'Sjukhus + husläkare', 'Dit du går när du är sjuk'],
  ['e', 'blå', 'bär', 'plockare', 'Blåbär + bärplockare', 'Blått skogsbär'],
  ['m', 'bok', 'hylla', 'vägg', 'Bokhylla + vägghylla', 'Där böckerna står'],
  ['m', 'blom', 'kruka', 'växt', 'Blomkruka + krukväxt', 'Behållare för blommor'],
  ['m', 'peppar', 'kaka', 'deg', 'Pepparkaka + kakdeg', 'Juligt bakverk'],
  ['m', 'tvätt', 'björn', 'kram', 'Tvättbjörn + björnkram', 'Litet djur med mask runt ögonen'],
  ['m', 'smör', 'gås', 'lever', 'Smörgås + gåslever', 'Frukost på en macka'],
  ['m', 'tand', 'kött', 'färs', 'Tandkött + köttfärs', 'Det rosa runt tänderna'],
  ['m', 'blixt', 'lås', 'kedja', 'Blixtlås + låskedja', 'Stänger jackan'],
];

// --- Japanese jukugo (real, common) — staged is_active=false pending IME ---
const JA = [
  ['e', '日', '本', '屋', '日本 (nihon) + 本屋 (honya)', '国の名前と、本を売る店'],
  ['e', '電', '車', '道', '電車 (densha) + 車道 (shadō)', '通学に使う乗り物'],
  ['e', '手', '紙', '袋', '手紙 (tegami) + 紙袋 (kamibukuro)', 'メッセージを送るもの'],
  ['e', '学', '校', '長', '学校 (gakkō) + 校長 (kōchō)', '子供が学ぶ場所'],
  ['e', '先', '生', '徒', '先生 (sensei) + 生徒 (seito)', '教える人と学ぶ人'],
  ['e', '水', '着', '物', '水着 (mizugi) + 着物 (kimono)', 'プールで着るもの'],
  ['e', '火', '山', '頂', '火山 (kazan) + 山頂 (sanchō)', '噴火する山'],
  ['e', '朝', '日', '記', '朝日 + 日記 (nikki)', '一日の始まりの光'],
  ['m', '人', '口', '紅', '人口 (jinkō) + 口紅 (kuchibeni)', 'ある地域に住む人の数'],
  ['m', '本', '当', '然', '本当 (hontō) + 当然 (tōzen)', '嘘ではないこと'],
  ['m', '外', '国', '語', '外国 (gaikoku) + 国語 (kokugo)', '日本以外の国'],
  ['m', '電', '話', '題', '電話 (denwa) + 話題 (wadai)', '声で話す通信手段'],
];

const rows = [];
const pad = (n) => String(n).padStart(3, '0');
function add(locale, list, active) {
  let e = 0, m = 0;
  for (const [d, word1, bridge, word2, ex, hint] of list) {
    const difficulty = d === 'e' ? 'easy' : 'medium';
    const n = d === 'e' ? ++e : ++m;
    rows.push({
      id: `${locale}-${d}-${pad(n)}`,
      locale,
      word1,
      bridge,
      word2,
      accepted_answers: [],
      hint,
      examples: [{ w1: ex.split(' + ')[0], bridge, w2: ex.split(' + ')[1] }],
      difficulty,
      source: 'council-seed',
      is_active: active,
    });
  }
}
add('es', ES, true);
add('sv', SV, true);
add('ja', JA, false);

const { error } = await sb.from('connections_puzzles').upsert(rows, { onConflict: 'id' });
if (error) {
  console.error('ERR', error.message);
  process.exit(1);
}
const counts = {};
for (const loc of ['es', 'sv', 'ja']) {
  const { count } = await sb
    .from('connections_puzzles')
    .select('*', { count: 'exact', head: true })
    .eq('locale', loc);
  counts[loc] = count;
}
console.log('seeded', rows.length, '| es/sv active, ja staged inactive |', JSON.stringify(counts));
