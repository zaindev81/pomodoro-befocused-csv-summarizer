import fs from "node:fs";
import path from "node:path";
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

function normalizeDate (s: string) {
  return s
    .replace(/\u202F|\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const inputArg = process.argv[2] || DEFAULT_INPUT_FILENAME;
  const filterDateArg = process.argv[3] || null;

  const INPUT_FILE = path.isAbsolute(inputArg)
    ? inputArg
    : path.resolve(process.cwd(), inputArg);
  const OUTPUT_FILE = path.resolve(process.cwd(), OUTPUT_FILENAME);

  const summary: Record<string, number> = {};

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_FILE)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) =>
            typeof value === "string" ? value.trim() : value,
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

        if (filterDateArg && date !== filterDateArg) return;

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

        console.log("\n=== Last 500 Lines ===\n" + lines.slice(-500));

        resolve();
      })
      .on("error", (err) => {
        console.error(`Failed to read the file: ${INPUT_FILE}`);
        console.error(err.message);
        reject(err);
      });
  });
}

void main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});