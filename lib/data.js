// Reads the CSV files in the /data folder.
// This runs on the server (at build time on Vercel), never in the browser.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

// Parse CSV text into an array of objects keyed by the header row.
// Handles quoted fields, commas and line breaks inside quotes, and "" escapes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // Strip a byte-order mark (Excel sometimes adds one).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

// Read one file from /data by name, e.g. readCsv("councillors").
export function readCsv(name) {
  const file = path.join(DATA_DIR, `${name}.csv`);
  if (!fs.existsSync(file)) return [];
  return parseCsv(fs.readFileSync(file, "utf8"));
}

export const getTerms = () => readCsv("terms");
export const getCouncillors = () => readCsv("councillors");
export const getSeats = () => readCsv("seats");
export const getMeetings = () => readCsv("meetings");
export const getMotions = () => readCsv("motions");
export const getVotes = () => readCsv("votes");
export const getExpenses = () => readCsv("expenses");
