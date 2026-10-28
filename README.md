# handoff-kit (MVP)

> **你的 AI 每次換對話就忘光;這個把一天的亂日誌壓成一頁交接稿。**

把一份又長又亂的工作紀錄,壓成一頁交接稿。

## 為什麼

agent 專案幾乎都死在這裡:context 一滿就要交接,而交接稿是**手寫**的。一天寫掉一萬字。
寫的人累,讀的人(下一個 session 的自己)也累,而且欄位每次都不一樣。

## 它做什麼

輸入一份 markdown 紀錄(會議記錄、agent 執行筆記、開發日誌都行),
輸出六個區塊的交接稿:

| 區塊 | 從哪來 |
|---|---|
| BLOCKED / 卡住 | 以 🛑 ⛔ ❌ 🚫 開頭的條目 |
| PITFALLS / 踩過的坑 | 🐛 🪤 ⚠ |
| TODO / 待決定 | ⏭ ⏳ 📌 ☐,或內文含「待確認/待決定/等人/下一步」 |
| DONE / 已完成 | ✔ ✅ 🏁 |
| INSIGHT / 判斷 | 🧠 💡 🔎 💬 |
| META / 環境 | 🌙 🕗 🎭 |

規則(弱到強,依序):
1. 條目自己的**行首標記**(強訊號):🛑 ⛔ ❌、🐛 🪤 ⚠、⏭ ⏳ 📌 ☐、✔ ✅ 🏁、🧠 💡 🔎 💬、🌙 🕗 🎭
2. 條目自己的**內文關鍵字**(弱訊號):待確認、待決定、等人、完成、修好、結論…
3. **所屬標題**——只在標題**開頭**就是標記時才算(「✅ 已經通了的事」算,「14:03 安裝完成」不算:中間出現「完成」是敘述,不是結論)
4. 三個都沒中 → 收進最後一段 **UNCLASSIFIED / 未分類**,**不丟**

其他:去重、保留每區最新 N 條、`--since` 可用「條目上的日期」或「所屬標題上的日期」。

## 結構

```
handoff.mjs          CLI:解析參數、挑 adapter、印或寫檔
core.mjs             draft(entries, opts) → 交接稿。不知道輸入是 md 還是 jsonl
adapters/markdown.mjs  條列式 markdown → Entry[]
adapters/jsonl.mjs     (骨架,throw not implemented)
handoff.ps1          PowerShell 薄殼,轉呼叫 handoff.mjs
```

`Entry = { text: string, extra: string[], heading?: string, date?: string }` —— core 只認這個形狀。
`heading` 是每個條目上方最近的 `##`/`###` 標題,`date` 是往上找到的最近 `YYYY-MM-DD`;兩個都是選填,沒有就當沒有。

## 用法

```powershell
# Node 版
node handoff.mjs worklog.md --out handoff.md --per 12
node handoff.mjs worklog.md --from jsonl          # 目前會 throw:還沒實作

# PowerShell 版(薄殼,轉呼叫 handoff.mjs)
powershell -NoProfile -ExecutionPolicy Bypass -File handoff.ps1 `
  -Path worklog.md -Out handoff.md -Per 12
```

- `-Path` / 位置參數:輸入檔(必填)
- `--out` / `-Out`:輸出檔,不給就印到畫面
- `--per` / `-Per`:每區保留幾條,不給就用 core 的預設 25
- `--since` / `-Since`:只收這天之後的條目
- `--from` / `-From`:`md`(預設)或 `jsonl`

⚠ 直接 `& .\handoff.ps1` 會被擋(「未數位簽章」)。要從外面叫:
`powershell -NoProfile -ExecutionPolicy Bypass -File .\handoff.ps1 -Path ... -Out ...`

## 範例(真的跑出來的)

`examples/sample-log.md`(25 行雜亂日誌)→ `examples/sample-handoff.md`(六區 + 未分類,14 classified + 3 unclassified)。

那 25 行裡有 3 行沒標記(「吃午餐」這種),它們**沒有被丟掉**,而是收進最後一段「未分類」等你掃一眼。
這就是它的取捨:**它不判斷內容重不重要,只看你有沒有標。** 所以寫日誌時多花兩秒打個 ✅ 或 🐛,交接稿就準兩倍。

## 怎麼加一個 adapter

1. 在 `adapters/` 開一個檔,export `loadEntries(path)`。
2. 回傳 `{ entries: [{ text, extra }], lineCount }`;`text` 是一條紀錄,`extra` 是它底下的續行。
3. 在 `handoff.mjs` 的 `FORMATS` 加一筆 `['<cli 名>', '<模組名>']`。
4. 跑一次,跟舊格式的輸出比對(除了 `generated:` 那行要逐字相同)。

core 不用動,分類、去重、`--since`、渲染都留給它。

## 實測(2026-10-26)

一份真實的 agent 日誌(1,449 行 / 11.7 萬字) → **100 行 / 7,331 字**(約 16 倍壓縮)。
1,018 個條目裡認出 160 個,其餘 858 個沒有標記 → 丟掉。

## 已知限制

- 只認條列式(`- ` / `* ` / `1. `)。散文段落不處理。
- 分類靠標記與關鍵字,**不理解語意**。判斷品質取決於寫日誌的人有沒有好好標。
- 標題後備分類只看**標題開頭**的標記;標題中間提到「完成」「結論」不會影響底下條目(刻意的,否則「安裝完成 + 現況」會把整段吃成 DONE)。
- `rules.json` 目前**沒有任何程式在讀**:舊的 PowerShell 版會讀它,現在 PowerShell 只剩薄殼。
  要拿回來就讓 `core.mjs` 吃它(改分類表),但那會動到既有輸出,另開一次改。
- `handoff.ps1` 不綁死任何路徑,它依序找:`$env:HANDOFF_NODE` → PATH 上的 `node` → `$env:HANDOFF_ELECTRON`(Electron 版 runtime,會用 `ELECTRON_RUN_AS_NODE=1` 跑)。

## 還沒做(Roadmap)

- 時間窗(不只 `--since`),以及「只輸出 BLOCKED + TODO」的精簡模式。
- 開頭自動產生三行「如果你只有 30 秒」摘要。
- 吃 JSONL(agent 的原始事件流),不只 markdown —— 這樣就不必先人工補標記。
- 讓分類表從 `rules.json` 讀,而不是寫在程式裡。
