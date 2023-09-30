import { hebrewLetters } from "./consts";

export function generateRandomTable() {
    const newTable = [];
    for (let i = 0; i < 7; i++) {
      const row = [];
      for (let j = 0; j < 7; j++) {
        const randomLetter = hebrewLetters[Math.floor(Math.random() * hebrewLetters.length)];
        row.push(randomLetter);
      }
      newTable.push(row);
    }
    return newTable;
  }