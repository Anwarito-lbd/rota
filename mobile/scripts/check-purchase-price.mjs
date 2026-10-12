// Checks parsePurchasePrice, the reading of the "Prix d'achat" field. Its result
// becomes suggested_value, which Rota auto-approves up to 900 €, so a misread
// ("1 200,50" → 120050) matters. No test runner in mobile/: plain Node.
//
//   node scripts/check-purchase-price.mjs
//
// Node 22.18+ strips the TypeScript types of the imported file.
import assert from 'node:assert/strict';
import { parsePurchasePrice } from '../src/data/taxonomy.ts';

const cases = [
  ['1 200,50', 1200],
  ['1.200', 1200],
  ['45,90', 45],
  ['1200', 1200],
  ['1,200', 1200],
  ['1 200', 1200],
  ['12.5', 12],
  ['1.234.567,89', 1234567],
  ['', 0],
  [',', 0],
];

for (const [text, expected] of cases) {
  assert.equal(parsePurchasePrice(text), expected, `"${text}" should read as ${expected}`);
}
console.log(`parsePurchasePrice: ${cases.length} cases pass`);
