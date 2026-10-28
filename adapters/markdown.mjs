// markdown adapter: a line starting with -/*/number. plus its indented continuations is one entry.
// Contract: loadEntries(path) -> { entries: Entry[], lineCount: number }
//           Entry = { text, extra: string[], heading?: string, date?: string }
//
// Headings are context, not entries. Every entry remembers the nearest heading above it
// (`heading`) and, if any heading above it carries a date, that date (`date`).
// That way a log written as "## 2026-10-27" + "- 21:34 ..." can still be filtered by --since.

import { readFileSync } from 'node:fs';

const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/;
const ENTRY = /^\s{0,2}(?:[-*]|\d+[.)])\s+/;
const DATE = /(\d{4})-(\d{2})-(\d{2})/;

function nearestHeading(stack) {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]) return stack[i].text;
  return undefined;
}

function nearestDate(stack) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (!stack[i]) continue;
    const m = stack[i].text.match(DATE);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return undefined;
}

export function collectEntries(lines) {
  const entries = [];
  const stack = []; // stack[level-1] = { text } — deeper levels are cleared by a shallower heading
  let cur = null;

  const close = () => { if (cur) { entries.push(cur); cur = null; } };

  for (const line of lines) {
    const h = line.match(HEADING);
    if (h) {
      close();
      const level = h[1].length;
      stack.length = Math.min(stack.length, level - 1);
      stack[level - 1] = { text: h[2].trim() };
      continue;
    }
    if (ENTRY.test(line)) {
      close();
      cur = {
        text: line.replace(ENTRY, '').trim(),
        extra: [],
        heading: nearestHeading(stack),
        date: nearestDate(stack),
      };
    } else if (cur && /^\s{2,}\S/.test(line)) {
      cur.extra.push(line.trim());
    } else if (cur && line.trim() === '') {
      // keep the entry open across a single blank line
    } else {
      close();
    }
  }
  close();
  return entries;
}

export function loadEntries(inputPath) {
  const raw = readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  return { entries: collectEntries(lines), lineCount: lines.length };
}
