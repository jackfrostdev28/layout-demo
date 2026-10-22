import assert from 'node:assert/strict';
import { highlightCss, highlightHtml } from '../src/highlight.ts';
import {
  PRESETS,
  addColumn,
  generateAll,
  generateCss,
  generateHtml,
  layoutFromPreset,
  matchingPresetId,
  placeItemsValue,
  removeColumn,
  swapAreas,
  validateAreas,
} from '../src/model.ts';

const magazine = PRESETS.find((preset) => preset.id === 'magazine');
assert.ok(magazine);
assert.deepEqual(magazine.columns, [1, 2, 1]);
assert.deepEqual(magazine.rows, [1, 3, 1]);
assert.deepEqual(magazine.areas, [
  ['header', 'header', 'header'],
  ['main', 'main', 'aside'],
  ['nav', 'footer', 'footer'],
]);

const layout = layoutFromPreset(magazine);
const css = generateCss(layout);
const normalized = css.replace(/ +/g, ' ');
assert.match(css, /display:\s*grid;/);
assert.match(css, /grid-template-columns:\s*1fr 2fr 1fr;/);
assert.match(css, /grid-template-rows:\s*1fr 3fr 1fr;/);
assert.match(css, /column-gap:\s*12px;/);
assert.match(css, /row-gap:\s*12px;/);
assert.match(css, /place-items:\s*stretch;/);
assert.match(normalized, /"header header header"/);
assert.match(normalized, /"main main aside"/);
assert.match(normalized, /"nav footer footer"/);
assert.match(css, /\.header \{ grid-area: header; \}/);
assert.match(css, /\.main \{ grid-area: main; \}/);

const html = generateHtml(magazine.areas);
assert.match(html, /<header class="header">Header<\/header>/);
assert.match(html, /<nav class="nav">Nav<\/nav>/);
assert.match(html, /<main class="main">Main<\/main>/);
assert.match(html, /<aside class="aside">Aside<\/aside>/);
assert.match(html, /<footer class="footer">Footer<\/footer>/);
assert.doesNotMatch(html, /card-a/);

assert.equal(matchingPresetId(layout), 'magazine');
assert.equal(placeItemsValue('center', 'center'), 'center');
assert.equal(placeItemsValue('start', 'end'), 'start end');
assert.equal(placeItemsValue('stretch', 'stretch'), 'stretch');

const swapped = swapAreas(magazine.areas, 'main', 'aside');
validateAreas(swapped);
assert.deepEqual(swapped, [
  ['header', 'header', 'header'],
  ['aside', 'aside', 'main'],
  ['nav', 'footer', 'footer'],
]);
assert.equal(matchingPresetId({ ...layout, areas: swapped }), null);
assert.deepEqual(swapAreas(swapped, 'main', 'aside'), magazine.areas.map((row) => [...row]));

const wider = addColumn(magazine.columns, magazine.areas);
assert.deepEqual(wider.columns, [1, 2, 1, 1]);
assert.deepEqual(wider.areas.map((row) => row[3]), ['.', '.', '.']);
const narrower = removeColumn(wider.columns, wider.areas, 3);
assert.deepEqual(narrower.columns, [1, 2, 1]);
assert.deepEqual(narrower.areas, magazine.areas.map((row) => [...row]));

const all = generateAll(layout);
assert.match(all, /\.layout \{/);
assert.match(all, /<div class="layout">/);

const tokens = highlightCss(css);
assert.ok(tokens.some((token) => token.kind === 'selector' && token.text === '.layout'));
assert.ok(tokens.some((token) => token.kind === 'property' && token.text === 'display'));
assert.ok(tokens.some((token) => token.kind === 'value' && token.text === 'grid'));
assert.ok(tokens.some((token) => token.kind === 'string' && token.text.includes('header')));

const htmlTokens = highlightHtml(html);
assert.ok(htmlTokens.some((token) => token.kind === 'tag' && token.text === 'header'));
assert.ok(htmlTokens.some((token) => token.kind === 'attr' && token.text === 'class'));
assert.ok(htmlTokens.some((token) => token.kind === 'string' && token.text === '"header"'));

for (const preset of PRESETS) {
  assert.equal(preset.areas.length, preset.rows.length);
  assert.ok(preset.areas.every((row) => row.length === preset.columns.length));
  validateAreas(preset.areas);
  const presetCss = generateCss(layoutFromPreset(preset));
  assert.match(presetCss, /display:\s*grid;/);
  assert.match(presetCss, /grid-template-areas:/);
}

console.log('model tests passed');
