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
export const getSalaries = () => readCsv("salaries");
export const getBudget = () => readCsv("budget");
export const getCapitalProjects = () => readCsv("capital_projects");
export const getBudgetReconciliation = () => readCsv("budget_reconciliation");
export const getActuals = () => readCsv("actuals");
export const getDocuments = () => readCsv("documents");
export const getBudgetAdoption = () => readCsv("budget_adoption");

// Terms, newest first.
export function getTermsSorted() {
  return getTerms().sort((a, b) => b.start_date.localeCompare(a.start_date));
}

// Every councillor with the seats they held, each seat joined to its term.
// Seats are newest term first; councillors are sorted by name.
export function getCouncillorsWithSeats() {
  const terms = new Map(getTerms().map((t) => [t.id, t]));
  const seats = getSeats();
  return getCouncillors()
    .map((c) => ({
      ...c,
      seats: seats
        .filter((s) => s.councillor_id === c.id)
        .map((s) => ({ ...s, term: terms.get(s.term_id) ?? null }))
        .sort((a, b) =>
          (b.term?.start_date ?? "").localeCompare(a.term?.start_date ?? "")
        ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCouncillorWithSeats(id) {
  return getCouncillorsWithSeats().find((c) => c.id === id) ?? null;
}

// Sunshine List pay for one councillor, newest year first.
// Covers every year the salary script checked (the years present in
// salaries.csv) in which the councillor held a seat. Years where they
// don't appear on the list come back with listed: false.
export function getSalaryHistory(councillorId) {
  const salaries = getSalaries();
  const checkedYears = [...new Set(salaries.map((s) => Number(s.year)))];
  const seatYears = new Set();
  const c = getCouncillorWithSeats(councillorId);
  for (const seat of c?.seats ?? []) {
    if (!seat.term) continue;
    const from = Number(seat.term.start_date.slice(0, 4));
    const to = Number(seat.term.end_date.slice(0, 4));
    for (let y = from; y <= to; y++) seatYears.add(y);
  }
  return checkedYears
    .filter((y) => seatYears.has(y))
    .sort((a, b) => b - a)
    .map((year) => {
      const row = salaries.find(
        (s) => s.councillor_id === councillorId && Number(s.year) === year
      );
      return row
        ? { year, listed: true, salary: row.salary, benefits: row.taxable_benefits, source_url: row.source_url }
        : { year, listed: false };
    });
}

// "123204.45" -> "$123,204.45"
export function formatMoney(value) {
  const n = Number(value);
  if (value === "" || !Number.isFinite(n)) return "";
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

// "2022-11-15" -> "November 15, 2022" (no time-zone shifting).
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return iso ?? "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
