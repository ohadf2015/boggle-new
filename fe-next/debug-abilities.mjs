import { es } from './translations/es.js';

console.log('Has adventure.bosses:', !!es.adventure?.bosses);
console.log('Has adventure.bosses.abilities:', !!es.adventure?.bosses?.abilities);
console.log('adventure.bosses keys:', Object.keys(es.adventure?.bosses || {}));
console.log('Has adventure.bosses.abilities.popQuiz:', !!es.adventure?.bosses?.abilities?.popQuiz);
if (es.adventure?.bosses?.abilities?.popQuiz) {
  console.log('popQuiz keys:', Object.keys(es.adventure.bosses.abilities.popQuiz));
  console.log('popQuiz:', es.adventure.bosses.abilities.popQuiz);
}
