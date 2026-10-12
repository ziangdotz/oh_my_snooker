import path from 'node:path';
import { readFile } from 'node:fs/promises';

/** Expand local imports in order so CSS regression still compares every original rule. */
export async function readStylesheet(file, active = new Set()) {
  const absolute = path.resolve(file);
  if (active.has(absolute)) {
    throw new Error('Circular stylesheet import: ' + absolute);
  }
  const parents = new Set([...active, absolute]);
  const css = await readFile(absolute, 'utf8');
  let output = '';
  let offset = 0;
  for (const match of css.matchAll(/@import\s+url\(['"]?((?:\.\/)?[a-z-]+\.css)['"]?\);/g)) {
    output += css.slice(offset, match.index);
    output += await readStylesheet(path.join(path.dirname(absolute), match[1]), parents);
    offset = match.index + match[0].length;
  }
  output += css.slice(offset);
  if (/@import\b/.test(output)) {
    throw new Error('Unsupported stylesheet import: ' + absolute);
  }
  return output;
}
