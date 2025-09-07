import fs from "fs";
import path from "path";
import csv from "csv-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

interface CsvRow {
  "Start date": string;
  Duration: string;
  "Assigned task": string;
  "Task state": string;
}

const DEFAULT_INPUT_FILENAME = "BeFocused.csv";
const OUTPUT_FILENAME = "output.csv";

const inputArg = process.argv[2] || DEFAULT_INPUT_FILENAME;
const filterDateArg = process.argv[3] || null;

const INPUT_FILE = path.isAbsolute(inputArg)
  ? inputArg
  : path.resolve(process.cwd(), inputArg);
const OUTPUT_FILE = path.resolve(process.cwd(), OUTPUT_FILENAME);

const summary: Record<string, number> = {};

function normalizeDate (s: string) {
  return s
    .replace(/\u202F|\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

fs.createReadStream(INPUT_FILE)
  .pipe(
    csv({
      mapHeaders: ({ header }) => header.trim(),
      mapValues: ({ value }) => (typeof value === "string" ? value.trim() : value),
      skipLines: 0,
    })
  )
  .on("data", (row: CsvRow) => {
    const raw = row["Start date"];
    if (!raw) return;

    const norm = normalizeDate(raw);

    let d = dayjs(norm, "D MMM YYYY [at] h:mm:ss A", true);

    if (!d.isValid()) {
      const alt = norm.replace(" at ", " ");
      d = dayjs(alt, "D MMM YYYY h:mm:ss A", true);
    }

    if (!d.isValid()) return;

    const date = d.format("YYYY-MM-DD");

    if (filterDateArg && date !== filterDateArg) {
      return;
    }

    const task = row["Assigned task"]?.trim() || "Unknown";
    const durationNum = Number(row["Duration"]);
    if (!Number.isFinite(durationNum)) return;

    const key = `${date},${task}`;
    summary[key] = (summary[key] ?? 0) + durationNum;
  })
  .on("end", () => {
    const header = "Date,Assigned task,Duration\n";
    const lines = Object.entries(summary)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, total]) => `${key},${total}`)
      .join("\n");

    fs.writeFileSync(OUTPUT_FILE, header + lines);
    console.log(`The summary has been saved to: ${OUTPUT_FILE}`);
  })
  .on("error", (err) => {
    console.error(`Failed to read the file: ${INPUT_FILE}`);
    console.error(err.message);
  });
