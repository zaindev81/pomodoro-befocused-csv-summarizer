# Pomodoro BeFocused CSV Summarizer

Summarize **BeFocused** export CSV logs by **date and task**, producing a clean `output.csv`.

* Parses timestamps like `15 Nov 2025 at 4:45:12 AM`
* Normalizes weird spaces (non-breaking, narrow no-break)
* Aggregates `Duration` (minutes) by **Date + Assigned task**
* Optional filter for a single date (`YYYY-MM-DD`)
* Outputs: `Date,Assigned task,Duration`

## Input CSV (expected headers)

```
Start date,Duration,Assigned task,Task state
15 Nov 2025 at 4:45:12 AM,37,Work,In Progress
...
```

* **Start date**: e.g. `D MMM YYYY at h:mm:ss A` (fallback accepts without `at`)
* **Duration**: number (minutes)
* **Assigned task**: string
* **Task state**: ignored by the summarizer

## Output CSV

```
Date,Assigned task,Duration
2025-11-15,Other,50
...
```

## Install

```bash
npm install
```

## Usage

### Run

```bash
# reads BeFocused.csv in CWD
npm start

# custom input file
npm start ./output.csv

# filter one date
npm start ./output.csv 2025-11-15

# output line
npm start ./output.csv 2025-11-15 500
```

The script writes `output.csv` alongside your working directory and logs:

```
The summary has been saved to: /absolute/path/output.csv
```

## CLI

```
npx tsx summarize.ts [INPUT_FILE] [FILTER_DATE]
```

* `INPUT_FILE` (optional): path to CSV. Defaults to `BeFocused.csv`.
* `FILTER_DATE` (optional): `YYYY-MM-DD`. When provided, only rows matching that date are aggregated.

## Notes on parsing

* Uses `dayjs` with `customParseFormat`.
* Primary format: `"D MMM YYYY [at] h:mm:ss A"`.
* Fallback: replaces `" at "` with space and parses `"D MMM YYYY h:mm:ss A"`.
* Non-breaking and narrow spaces are normalized before parsing.

## Errors & troubleshooting

* **“Failed to read the file”**: Check path/permissions and that the CSV exists.
* **Empty output**: Make sure headers match exactly and dates conform to one of the supported formats.
* **Wrong totals**: Verify `Duration` is numeric minutes in the source CSV.

---

## License

MIT License