// Translations index - combines all language files
const { en } = require('./en.js');
const { he } = require('./he.js');
const { sv } = require('./sv.js');
const { ja } = require('./ja.js');
const { es } = require('./es.js');

const translations = {
  en,
  he,
  sv,
  ja,
  es,
};

module.exports = { translations };
