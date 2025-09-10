import fs from "node:fs";
import path from "node:path";
import csv from "csv-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Command } from "commander";

dayjs.extend(customParseFormat);

interface CsvRow {
  "Start date": string;
  Duration: string;
  "Assigned task": string;
  "Task state": string;
}

const DEFAULT_INPUT_FILENAME = "BeFocused.csv";
const DEFAULT_OUTPUT_FILENAME = "output.csv";
const DEFAULT_OUTPUT_LINES = 500;

function normalizeDate(s: string): string {
  return s
    .replace(/\u202F|\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ProcessOptions {
  input: string;
  output: string;
  filterDate?: string;
  lines: number;
  hours?: boolean;
}

async function processCsv(options: ProcessOptions): Promise<void> {
  const INPUT_FILE = path.isAbsolute(options.input)
    ? options.input
    : path.resolve(process.cwd(), options.input);

  const OUTPUT_FILE = path.isAbsolute(options.output)
    ? options.output
    : path.resolve(process.cwd(), options.output);

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

        if (options.filterDate && date !== options.filterDate) return;

        const task = row["Assigned task"]?.trim() || "Unknown";
        const durationNum = Number(row["Duration"]);

        if (!Number.isFinite(durationNum)) return;

        const key = `${date},${task}`;
        summary[key] = (summary[key] ?? 0) + durationNum;
      })
      .on("end", () => {
        // Prepare header and values: minutes or hours
        const header = options.hours
          ? "Date,Assigned task,Duration (hours)\n"
          : "Date,Assigned task,Duration\n";
        const lines = Object.entries(summary)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, total]) => {
            const value = options.hours ? (total / 60).toFixed(2) : total;
            return `${key},${value}`;
          })
          .join("\n");

        fs.writeFileSync(OUTPUT_FILE, header + lines);

        console.log(`The summary has been saved to: ${OUTPUT_FILE}`);

        const allLines = lines.split('\n');
        const displayLines = allLines.slice(-options.lines);

        console.log(`\n=== Last ${options.lines} Lines ===`);
        console.log(displayLines.join('\n'));
        // If a date filter is applied, display total for that date
        if (options.filterDate) {
          const totalForDate = Object.entries(summary)
            .filter(([key]) => key.startsWith(`${options.filterDate},`))
            .reduce((sum, [, value]) => sum + value, 0);
          if (options.hours) {
            console.log(`Total for ${options.filterDate}: ${(totalForDate / 60).toFixed(2)} hours`);
          } else {
            console.log(`Total for ${options.filterDate}: ${totalForDate} minutes`);
          }
        }

        resolve();
      })
      .on("error", (err) => {
        console.error(`Failed to read the file: ${INPUT_FILE}`);
        console.error(err.message);
        reject(err);
      });
  });
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("befocused-processor")
    .description("Process BeFocused CSV files and generate summaries")
    .version("1.0.0")
    .option(
      "-i, --input <file>",
      "Input CSV file path",
      DEFAULT_INPUT_FILENAME
    )
    .option(
      "-o, --output <file>",
      "Output CSV file path",
      DEFAULT_OUTPUT_FILENAME
    )
    .option(
      "-d, --filter-date <date>",
      "Filter by specific date (YYYY-MM-DD format, 'today', or 'yesterday')"
    )
    .option(
      "-l, --lines <number>",
      "Number of lines to display at the end",
      (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1) {
          throw new Error("Lines must be a positive integer");
        }
        return num;
      },
      DEFAULT_OUTPUT_LINES
    )
    .option(
      "-H, --hours",
      "Display durations in hours instead of minutes"
    )
    .option(
      "-h, --help",
      "Display help information"
    );

  program.parse();

  const options = program.opts() as ProcessOptions;
  options.hours = Boolean(options.hours);

  try {
    const inputPath = path.isAbsolute(options.input)
      ? options.input
      : path.resolve(process.cwd(), options.input);

    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file does not exist: ${inputPath}`);
      process.exit(1);
    }

    if (options.filterDate) {
      if (options.filterDate === "today") {
        options.filterDate = dayjs().format("YYYY-MM-DD");
      } else if (options.filterDate === "yesterday") {
        options.filterDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      } else {
        const dateCheck = dayjs(options.filterDate, "YYYY-MM-DD", true);
        if (!dateCheck.isValid()) {
          console.error(`Error: Invalid date format. Please use YYYY-MM-DD format, 'today', or 'yesterday'.`);
          process.exit(1);
        }
      }
    }

    console.log("Processing with options:", {
      input: options.input,
      output: options.output,
      filterDate: options.filterDate || "none",
      lines: options.lines
    });

    await processCsv(options);
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});