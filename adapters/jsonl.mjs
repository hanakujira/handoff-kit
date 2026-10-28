// jsonl adapter: one JSON object per line, for an agent's raw event stream.
// Not implemented on purpose: there is no real sample to model yet, and a guessed shape would be wrong.
// Contract: loadEntries(path) -> { entries: Entry[], lineCount: number }, Entry = { text, extra: string[] }

export function collectEntries() {
  throw new Error('jsonl adapter: not implemented');
}

export function loadEntries() {
  throw new Error('jsonl adapter: not implemented');
}
