export type Axis = 'start' | 'center' | 'end' | 'stretch';

export type Layout = {
  columns: number[];
  rows: number[];
  areas: string[][];
  columnGap: number;
  rowGap: number;
  align: Axis;
  justify: Axis;
};

export type Preset = {
  id: string;
  name: string;
  columns: readonly number[];
  rows: readonly number[];
  areas: readonly (readonly string[])[];
};

export type AreaMeta = {
  label: string;
  tag: string;
  color: string;
};

export const MIN_TRACKS = 1;
export const MAX_TRACKS = 6;
export const MIN_FR = 1;
export const MAX_FR = 8;
export const MIN_GAP = 0;
export const MAX_GAP = 48;

export const AREA_ORDER = [
  'header',
  'nav',
  'hero',
  'main',
  'aside',
  'card-a',
  'card-b',
  'card-c',
  'footer',
] as const;

const AREAS: Record<string, AreaMeta> = {
  header: { label: 'Header', tag: 'header', color: '#1d4ed8' },
  nav: { label: 'Nav', tag: 'nav', color: '#6d28d9' },
  main: { label: 'Main', tag: 'main', color: '#047857' },
  aside: { label: 'Aside', tag: 'aside', color: '#b45309' },
  footer: { label: 'Footer', tag: 'footer', color: '#be123c' },
  hero: { label: 'Hero', tag: 'section', color: '#0369a1' },
  'card-a': { label: 'Card A', tag: 'article', color: '#be185d' },
  'card-b': { label: 'Card B', tag: 'article', color: '#0f766e' },
  'card-c': { label: 'Card C', tag: 'article', color: '#c2410c' },
};

export const PLACE_OPTIONS = [
  ['start', 'start'],
  ['start', 'center'],
  ['start', 'end'],
  ['center', 'start'],
  ['center', 'center'],
  ['center', 'end'],
  ['end', 'start'],
  ['end', 'center'],
  ['end', 'end'],
] as const satisfies readonly (readonly [Axis, Axis])[];

function freezePreset(preset: Preset): Preset {
  const areas = preset.areas.map((row) => Object.freeze([...row]));
  return Object.freeze({
    ...preset,
    columns: Object.freeze([...preset.columns]),
    rows: Object.freeze([...preset.rows]),
    areas: Object.freeze(areas),
  });
}

export const PRESETS: readonly Preset[] = [
  freezePreset({
    id: 'holy-grail',
    name: 'Holy grail',
    columns: [1, 3, 1],
    rows: [1, 4, 1],
    areas: [
      ['header', 'header', 'header'],
      ['nav', 'main', 'aside'],
      ['footer', 'footer', 'footer'],
    ],
  }),
  freezePreset({
    id: 'sidebar',
    name: 'Sidebar',
    columns: [1, 3, 1],
    rows: [1, 4, 1],
    areas: [
      ['nav', 'header', 'header'],
      ['nav', 'main', 'aside'],
      ['nav', 'footer', 'footer'],
    ],
  }),
  freezePreset({
    id: 'dashboard',
    name: 'Dashboard',
    columns: [1, 1, 1, 1],
    rows: [1, 2, 2, 1],
    areas: [
      ['header', 'header', 'header', 'header'],
      ['nav', 'main', 'main', 'aside'],
      ['nav', 'card-a', 'card-b', 'card-c'],
      ['footer', 'footer', 'footer', 'footer'],
    ],
  }),
  freezePreset({
    id: 'magazine',
    name: 'Magazine',
    columns: [1, 2, 1],
    rows: [1, 3, 1],
    areas: [
      ['header', 'header', 'header'],
      ['main', 'main', 'aside'],
      ['nav', 'footer', 'footer'],
    ],
  }),
  freezePreset({
    id: 'hero',
    name: 'Hero',
    columns: [1, 1, 1],
    rows: [2, 1, 1],
    areas: [
      ['hero', 'hero', 'hero'],
      ['card-a', 'card-b', 'card-c'],
      ['nav', 'footer', 'aside'],
    ],
  }),
];

export function areaMeta(name: string): AreaMeta {
  return AREAS[name] ?? { label: name, tag: 'div', color: '#334155' };
}

export function clampFr(value: number): number {
  if (!Number.isFinite(value)) return MIN_FR;
  return Math.max(MIN_FR, Math.min(MAX_FR, Math.round(value)));
}

export function clampGap(value: number): number {
  if (!Number.isFinite(value)) return MIN_GAP;
  return Math.max(MIN_GAP, Math.min(MAX_GAP, Math.round(value)));
}

export function layoutFromPreset(preset: Preset): Layout {
  return {
    columns: [...preset.columns],
    rows: [...preset.rows],
    areas: preset.areas.map((row) => [...row]),
    columnGap: 12,
    rowGap: 12,
    align: 'stretch',
    justify: 'stretch',
  };
}

function sameList(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameAreas(left: readonly (readonly string[])[], right: readonly (readonly string[])[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((row, rowIndex) => {
    const other = right[rowIndex];
    return row.length === other.length && row.every((cell, columnIndex) => cell === other[columnIndex]);
  });
}

export function matchingPresetId(layout: Pick<Layout, 'columns' | 'rows' | 'areas'>): string | null {
  for (const preset of PRESETS) {
    if (
      sameList(preset.columns, layout.columns) &&
      sameList(preset.rows, layout.rows) &&
      sameAreas(preset.areas, layout.areas)
    ) {
      return preset.id;
    }
  }
  return null;
}

export function validateAreas(areas: readonly (readonly string[])[]): void {
  const cells = new Map<string, Array<[number, number]>>();
  areas.forEach((row, rowIndex) => {
    row.forEach((name, columnIndex) => {
      if (name === '.') return;
      const list = cells.get(name) ?? [];
      list.push([rowIndex, columnIndex]);
      cells.set(name, list);
    });
  });

  for (const [name, positions] of cells) {
    const rows = positions.map(([row]) => row);
    const columns = positions.map(([, column]) => column);
    const rowStart = Math.min(...rows);
    const rowEnd = Math.max(...rows);
    const columnStart = Math.min(...columns);
    const columnEnd = Math.max(...columns);
    const rectangle = (rowEnd - rowStart + 1) * (columnEnd - columnStart + 1);
    if (rectangle !== positions.length) {
      throw new Error(`Grid area "${name}" is not a rectangle`);
    }
  }
}

export function swapAreas(areas: readonly (readonly string[])[], source: string, target: string): string[][] {
  if (source === target || source === '.' || target === '.') {
    return areas.map((row) => [...row]);
  }
  return areas.map((row) => row.map((cell) => (cell === source ? target : cell === target ? source : cell)));
}

export function setTrackValue(tracks: readonly number[], index: number, value: number): number[] {
  return tracks.map((track, trackIndex) => (trackIndex === index ? clampFr(value) : track));
}

export function addColumn(
  columns: readonly number[],
  areas: readonly (readonly string[])[],
): { columns: number[]; areas: string[][] } {
  if (columns.length >= MAX_TRACKS) {
    return { columns: [...columns], areas: areas.map((row) => [...row]) };
  }
  return {
    columns: [...columns, 1],
    areas: areas.map((row) => [...row, '.']),
  };
}

export function addRow(
  rows: readonly number[],
  areas: readonly (readonly string[])[],
): { rows: number[]; areas: string[][] } {
  if (rows.length >= MAX_TRACKS) {
    return { rows: [...rows], areas: areas.map((row) => [...row]) };
  }
  const width = areas[0]?.length ?? 1;
  return {
    rows: [...rows, 1],
    areas: [...areas.map((row) => [...row]), Array.from({ length: width }, () => '.')],
  };
}

export function removeColumn(
  columns: readonly number[],
  areas: readonly (readonly string[])[],
  index: number,
): { columns: number[]; areas: string[][] } {
  if (columns.length <= MIN_TRACKS || index < 0 || index >= columns.length) {
    return { columns: [...columns], areas: areas.map((row) => [...row]) };
  }
  return {
    columns: columns.filter((_, columnIndex) => columnIndex !== index),
    areas: areas.map((row) => row.filter((_, columnIndex) => columnIndex !== index)),
  };
}

export function removeRow(
  rows: readonly number[],
  areas: readonly (readonly string[])[],
  index: number,
): { rows: number[]; areas: string[][] } {
  if (rows.length <= MIN_TRACKS || index < 0 || index >= rows.length) {
    return { rows: [...rows], areas: areas.map((row) => [...row]) };
  }
  return {
    rows: rows.filter((_, rowIndex) => rowIndex !== index),
    areas: areas.filter((_, rowIndex) => rowIndex !== index).map((row) => [...row]),
  };
}

export function firstCell(areas: readonly (readonly string[])[], name: string): { row: number; col: number } | null {
  for (let row = 0; row < areas.length; row += 1) {
    const column = areas[row].indexOf(name);
    if (column !== -1) return { row, col: column };
  }
  return null;
}

export function toTracks(tracks: readonly number[]): string {
  return tracks.map((track) => `${track}fr`).join(' ');
}

export function placeItemsValue(align: Axis, justify: Axis): string {
  if (align === justify) return align;
  return `${align} ${justify}`;
}

export function usedAreaNames(areas: readonly (readonly string[])[]): string[] {
  const present = new Set<string>();
  for (const row of areas) {
    for (const cell of row) {
      if (cell !== '.') present.add(cell);
    }
  }
  const ordered: string[] = AREA_ORDER.filter((name) => present.has(name));
  for (const name of present) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

export function formatAreaLines(areas: readonly (readonly string[])[]): string[] {
  const columnCount = areas[0]?.length ?? 0;
  const widths = Array.from({ length: columnCount }, (_, column) => {
    let width = 1;
    for (const row of areas) width = Math.max(width, row[column]?.length ?? 0);
    return width;
  });

  return areas.map((row) => {
    const parts = row.map((cell, index) => {
      if (index === row.length - 1) return cell;
      return cell.padEnd(widths[index] ?? cell.length, ' ');
    });
    return `"${parts.join(' ')}"`;
  });
}

export function generateCss(layout: Layout): string {
  const areaBody = formatAreaLines(layout.areas)
    .map((line) => `    ${line}`)
    .join('\n');
  const items = usedAreaNames(layout.areas)
    .map((name) => `.${name} { grid-area: ${name}; }`)
    .join('\n');
  const rule = `.layout {
  display: grid;
  grid-template-columns: ${toTracks(layout.columns)};
  grid-template-rows: ${toTracks(layout.rows)};
  column-gap: ${layout.columnGap}px;
  row-gap: ${layout.rowGap}px;
  place-items: ${placeItemsValue(layout.align, layout.justify)};
  grid-template-areas:
${areaBody};
}`;
  return items ? `${rule}\n\n${items}\n` : `${rule}\n`;
}

export function generateHtml(areas: readonly (readonly string[])[]): string {
  const lines = usedAreaNames(areas).map((name) => {
    const meta = areaMeta(name);
    return `  <${meta.tag} class="${name}">${meta.label}</${meta.tag}>`;
  });
  if (lines.length === 0) return `<div class="layout"></div>\n`;
  return `<div class="layout">\n${lines.join('\n')}\n</div>\n`;
}

export function generateAll(layout: Layout): string {
  return `${generateCss(layout).trimEnd()}\n\n${generateHtml(layout.areas).trimEnd()}\n`;
}

for (const preset of PRESETS) {
  if (preset.areas.length !== preset.rows.length) {
    throw new Error(`${preset.name} row count does not match grid-template-rows`);
  }
  if (preset.areas.some((row) => row.length !== preset.columns.length)) {
    throw new Error(`${preset.name} column count does not match grid-template-columns`);
  }
  validateAreas(preset.areas);
}
