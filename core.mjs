// handoff-kit core: entries -> classify -> dedupe -> --since -> render.
// Knows nothing about where the entries came from (markdown, jsonl, ...): that is an adapter's job.
// Pure ASCII in code; output text is whatever the input says.
//
// Two rules this file lives by:
//   1. Nothing is silently lost. An entry whose text and heading both lack a marker goes to the
//      UNCLASSIFIED section at the end, never into the bin.
//   2. A heading can classify an entry only when the entry itself carries no marker.

// ---- marker table: first match wins ----
export const KINDS = [
  { key: 'blocker', label: 'BLOCKED / 卡住', test: /(?:🛑|⛔|❌|🚫)/ },
  { key: 'pitfall', label: 'PITFALLS / 踩過的坑', test: /(?:🐛|🪤|⚠️|⚠)/ },
  { key: 'todo',    label: 'TODO / 待決定',      test: /(?:⏭|⏳|📌|☐|待確認|待決定|等人|下一步|拍板|請示|待回)/ },
  { key: 'done',    label: 'DONE / 已完成',      test: /(?:✔|✅|🏁|完成|修好)/ },
  { key: 'insight', label: 'INSIGHT / 判斷',     test: /(?:🧠|💡|🔎|💬|結論)/ },
  { key: 'meta',    label: 'META / 環境',        test: /(?:🌙|🕗|🎭|🐛 又|系統|時區)/ },
];

const UNCLASSIFIED_LABEL = 'UNCLASSIFIED / 未分類';

// A heading may classify an entry only when it STARTS with a marker.
// "✅ 已經通了的事" classifies; "14:03 安裝完成 + 現況" does not (完成 in the middle is prose, not a verdict).
const HEADING_MARKER = /^\s*[★☆•·>*_–—-]*\s*(?:🛑|⛔|❌|🚫|🐛|🪤|⚠|⏭|⏳|📌|☐|✔|✅|🏁|🧠|💡|🔎|💬|🌙|🕗|🎭)/;

function classify(text, heading) {
  for (const k of KINDS) if (k.test.test(text)) return k.key;
  if (heading && HEADING_MARKER.test(heading)) {
    for (const k of KINDS) if (k.test.test(heading)) return k.key;
  }
  return null;
}

function dateOf(text) {
  const m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function trim(s, n) {
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + 'Z';
}

/**
 * @param {object} o
 * @param {{text: string, extra: string[], heading?: string, date?: string}[]} o.entries
 * @param {number} o.lineCount  how many lines the input had (reported in the header)
 * @param {string} o.source     the path as given on the command line
 * @param {number} [o.per]      entries kept per section (the newest ones)
 * @param {string|null} [o.since]
 * @param {string} [o.generated] timestamp for the header, for tests
 * @returns {string}
 */
export function draft({ entries, lineCount, source, per = 25, since = null, generated = stamp() }) {
  const seen = new Set();
  const buckets = new Map(KINDS.map(k => [k.key, []]));
  const unclassified = [];
  const dropped = { since: 0, dup: 0 };
  let classifiedCount = 0;

  for (const e of entries) {
    const d = dateOf(e.text) || e.date || null;          // text wins, heading is the fallback
    if (since && d && d < since) { dropped.since++; continue; }

    const sig = trim(e.text.replace(/^(?:✔|✅|🐛|⏭|🔎|🛑|🧠|💬|🌙|⚠️)\s*/, ''), 48).toLowerCase();
    if (seen.has(sig)) { dropped.dup++; continue; }
    seen.add(sig);

    const kind = classify(e.text, e.heading);
    if (kind) { buckets.get(kind).push(e); classifiedCount++; }
    else unclassified.push(e);
  }

  const shownOf = list => list.slice(-per); // keep the most recent

  const out = [];
  out.push('# Handoff note (auto-drafted)');
  out.push('');
  out.push(`- source: \`${source}\` (${lineCount} lines)`);
  out.push(`- generated: ${generated}`);
  out.push(`- kept: ${classifiedCount} classified + ${Math.min(per, unclassified.length)}/${unclassified.length} unclassified`);
  out.push(`- dropped: ${dropped.since} before --since, ${dropped.dup} duplicates`);
  out.push('');
  out.push('> Review before handing over. This is a draft, not a verdict.');
  out.push('');

  for (const k of KINDS) {
    const items = buckets.get(k.key);
    if (!items.length) continue;
    out.push(`## ${k.label} (${items.length})`);
    out.push('');
    const shown = shownOf(items);
    if (items.length > shown.length) {
      out.push(`_(${items.length - shown.length} older entries omitted)_`);
      out.push('');
    }
    for (const it of shown) {
      out.push(`- ${trim(it.text, 320)}`);
      for (const ex of it.extra.slice(0, 2)) out.push(`  - ${trim(ex, 200)}`);
    }
    out.push('');
  }

  if (unclassified.length) {
    out.push(`## ${UNCLASSIFIED_LABEL} (${unclassified.length})`);
    out.push('');
    out.push('_No marker in the line and none in its heading. Kept, not judged — skim it yourself, or mark your log next time._');
    out.push('');
    const shown = shownOf(unclassified);
    if (unclassified.length > shown.length) {
      out.push(`_(${unclassified.length - shown.length} older entries omitted)_`);
      out.push('');
    }
    for (const it of shown) {
      const where = it.heading ? `  _(在「${trim(it.heading, 30)}」)_` : '';
      out.push(`- ${trim(it.text, 220)}${where}`);
    }
    out.push('');
  }

  return out.join('\n');
}
