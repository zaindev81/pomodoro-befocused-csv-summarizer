# Pomodoro BeFocused CSV Summarizer

Summarize **BeFocused** export CSV logs by **date and task**, producing a clean `output.csv`.

## Features

* Parses timestamps like `15 Nov 2025 at 4:45:12 AM`
* Normalizes weird spaces (non-breaking, narrow no-break)
* Aggregates `Duration` (minutes) by **Date + Assigned task**
* Optional date filtering with flexible options:
  - Specific dates (`YYYY-MM-DD`)
  - `today` for current date
  - `yesterday` for previous date
* Configurable output display lines
* Outputs clean CSV: `Date,Assigned task,Duration`

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

### Basic Usage

```bash
# Process BeFocused.csv in current directory (default behavior)
npm start

# Specify all options with full names
npm start -- --input mydata.csv --output result.csv --filter-date 2025-09-08 --lines 100

# Specify custom input/output files and date filter
npm start -- -i mydata.csv -o result.csv -d 2025-09-08 -l 100

# Filter for today's data only
npm start -- -i mydata.csv -o result.csv -d today -l 100

# Filter for yesterday's data only
npm start -- -i mydata.csv -o result.csv -d yesterday -l 100
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input CSV file path | `BeFocused.csv` |
| `--output` | `-o` | Output CSV file path | `output.csv` |
| `--filter-date` | `-d` | Filter by date (`YYYY-MM-DD`, `today`, or `yesterday`) | No filter |
| `--lines` | `-l` | Number of lines to display at the end | `500` |
| `--help` | `-h` | Display help information | - |

The script writes the summary to the specified output file (default: `output.csv`) and displays:

```
The summary has been saved to: /absolute/path/output.csv

=== Last 500 Lines ===
2025-11-15,Task A,120
2025-11-15,Task B,90
...
```

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