# handoff-kit (MVP)

> **Your AI forgets everything between conversations. This squeezes a messy day of work into a one-page handoff note.**

Give it a long, noisy work log; get a one-page handoff back.

[中文版說明](README.zh-TW.md)

## Why

Almost every agent project dies at the same spot: the context fills up, so you have to hand off — and the handoff note is **hand-written**. A day of it runs to ten thousand words.
It is tiring to write, tiring to read (the next session's you), and the fields are different every time.

## What it does

Input: a markdown log (meeting notes, agent run notes, a dev diary — anything bullet-shaped).
Output: a handoff note with six blocks.

| Block | Comes from |
|---|---|
| BLOCKED | entries starting with 🛑 ⛔ ❌ 🚫 |
| PITFALLS | 🐛 🪤 ⚠ |
| TODO | ⏭ ⏳ 📌 ☐, or entries whose text contains a to-do keyword |
| DONE | ✔ ✅ 🏁 |
| INSIGHT | 🧠 💡 🔎 💬 |
| META | 🌙 🕗 🎭 |

Classification runs from weak to strong:

1. The entry's own **leading marker** (strong signal): 🛑 ⛔ ❌, 🐛 🪤 ⚠, ⏭ ⏳ 📌 ☐, ✔ ✅ 🏁, 🧠 💡 🔎 💬, 🌙 🕗 🎭
2. The entry's own **body keywords** (weak signal), from `rules.json`.
3. Its **heading** — only when the heading *starts* with a marker (`✅ What now works` counts; `14:03 install finished` does not: a mention of "finished" mid-sentence is narration, not a conclusion).
4. Nothing matched → the entry lands in a final **UNCLASSIFIED** block. **It is never dropped.**

Also: de-duplication, keep the newest N per block, and `--since` that accepts either the date on an entry or the date on its heading.

## Layout

```
handoff.mjs             CLI: parse args, pick an adapter, print or write
core.mjs                draft(entries, opts) -> handoff. Does not care if the input was md or jsonl
adapters/markdown.mjs   bullet markdown -> Entry[]
adapters/jsonl.mjs      (skeleton, throws "not implemented")
handoff.ps1             thin PowerShell wrapper that calls handoff.mjs
```

`Entry = { text: string, extra: string[], heading?: string, date?: string }` — core understands only this shape.
`heading` is the nearest `##`/`###` above the entry, `date` is the nearest `YYYY-MM-DD` found going upwards; both optional.

## Usage

```powershell
# Node
node handoff.mjs worklog.md --out handoff.md --per 12
node handoff.mjs worklog.md --from jsonl          # throws for now: not implemented yet

# PowerShell (thin wrapper around handoff.mjs)
powershell -NoProfile -ExecutionPolicy Bypass -File handoff.ps1 `
  -Path worklog.md -Out handoff.md -Per 12
```

- `-Path` / positional: input file (required)
- `--out` / `-Out`: output file; omit to print to stdout
- `--per` / `-Per`: how many entries to keep per block (default 25)
- `--since` / `-Since`: only entries from this day onward
- `--from` / `-From`: `md` (default) or `jsonl`

⚠ Calling `& .\handoff.ps1` directly is blocked by the default execution policy ("not digitally signed"). From the outside:

`powershell -NoProfile -ExecutionPolicy Bypass -File .\handoff.ps1 -Path ... -Out ...`

## Example (actually generated)

`examples/sample-log.md` (25 messy lines) → `examples/sample-handoff.md` (six blocks + unclassified: 14 classified, 3 unclassified). Both examples are in Chinese.

Three of those 25 lines carry no marker ("had lunch"). They are **not discarded** — they land in the final "unclassified" block for you to glance at.

That is the trade-off this tool makes: **it does not judge what matters, only whether you marked it.** Spend two extra seconds typing a ✅ or a 🐛 while you write, and the handoff gets twice as accurate.

## Adding an adapter

1. Create a file in `adapters/` exporting `loadEntries(path)`.
2. Return `{ entries: [{ text, extra }], lineCount }` — `text` is one record, `extra` is its continuation lines.
3. Add an entry `['<cli name>', '<module name>']` to `FORMATS` in `handoff.mjs`.
4. Run it and diff against the previous format's output (everything except the `generated:` line should match byte for byte).

Core stays untouched: classification, de-duplication, `--since` and rendering all live there.

## Measured (2026-10-26)

A real agent log (1,449 lines / ~117k characters) → **100 lines / 7,331 characters** (about 16× compression).
Of 1,018 entries, 160 were recognised; the other 858 had no markers and were dropped.

## Known limits

- Bullet lists only (`- ` / `* ` / `1. `). Prose paragraphs are ignored.
- Classification is markers and keywords; **it does not understand meaning**. Quality depends on how well the log was marked up.
- The heading fallback only looks at the **start** of a heading; "finished" or "conclusion" in the middle of a heading does not affect its entries. (Deliberate: otherwise a heading like "install finished + status" would swallow the whole section into DONE.)
- `rules.json` is currently **read by nothing**: the old PowerShell implementation used it, and PowerShell is now only a wrapper. Feeding it back into `core.mjs` is possible, but that changes existing output, so it is a separate change.
- `handoff.ps1` hardcodes no paths. It looks for, in order: `$env:HANDOFF_NODE` → `node` on PATH → `$env:HANDOFF_ELECTRON` (an Electron runtime, run with `ELECTRON_RUN_AS_NODE=1`).

## Roadmap

- Time windows (not just `--since`), and a `BLOCKED + TODO only` mode.
- An auto-generated three-line "if you only have 30 seconds" summary at the top.
- Ingest JSONL (an agent's raw event stream) instead of hand-marked markdown.
- Read the classification table from `rules.json` instead of having it in code.

## License

MIT — see [LICENSE](LICENSE).
