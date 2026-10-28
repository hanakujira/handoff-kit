#!/usr/bin/env node
// handoff-kit MVP: turn a long running log / notes file into a one-page handoff note.
// Usage: node handoff.mjs <input> [--out <file>] [--per <n>] [--since <YYYY-MM-DD>] [--from md|jsonl]
// The input format lives in adapters/<from>.mjs; everything after that is core.mjs and format-blind.

import { writeFileSync } from 'node:fs';
import { draft } from './core.mjs';

// --from value -> adapter module name
const FORMATS = new Map([['md', 'markdown'], ['jsonl', 'jsonl']]);

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node handoff.mjs <input> [--out file] [--per 25] [--since 2026-10-26] [--from md|jsonl]');
  process.exit(1);
}

const inputPath = args[0];
const opt = { out: null, per: 25, since: null, from: 'md' };
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') opt.out = args[++i];
  else if (a === '--per') opt.per = parseInt(args[++i], 10) || 25;
  else if (a === '--since') opt.since = args[++i];
  else if (a === '--from') opt.from = args[++i];
}

if (!FORMATS.has(opt.from)) {
  console.error(`unknown --from ${opt.from}; expected one of: ${[...FORMATS.keys()].join(', ')}`);
  process.exit(1);
}

const { loadEntries } = await import(new URL(`./adapters/${FORMATS.get(opt.from)}.mjs`, import.meta.url));
const { entries, lineCount } = loadEntries(inputPath);
const text = draft({ entries, lineCount, source: inputPath, per: opt.per, since: opt.since });

if (opt.out) {
  writeFileSync(opt.out, text, 'utf8');
  console.log(`wrote ${opt.out} (${text.length} chars)`);
} else {
  process.stdout.write(text);
}
