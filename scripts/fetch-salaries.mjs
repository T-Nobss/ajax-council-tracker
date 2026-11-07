// Builds data/salaries.csv from Ontario's Public Sector Salary Disclosure
// (the "Sunshine List").
//
//   npm run salaries                # years 2022–2025
//   npm run salaries -- 2022 2026   # a different range (first and last year)
//
// What it does:
//   1. Reads Ontario's index of Sunshine List files for every year.
//   2. Downloads each year's main list ("Compendium") and, if there is one,
//      its correction file ("Addendum": additions, changes and deletions).
//   3. Keeps rows where the employer is the Town of Ajax and the job title
//      contains "Mayor" or "Councillor".
//   4. Matches each person to a name in data/councillors.csv.
//   5. Writes data/salaries.csv (replacing it) and data/review/salaries.md,
//      which lists anything that needs a human to check.
//
// Note: the list for year X covers money paid in year X and is published
// in spring of year X+1 (e.g. the 2025 list came out in March 2026).
// Only people paid $100,000 or more appear on the list at all.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../lib/data.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const OUT_CSV = path.join(DATA, "salaries.csv");
const OUT_REVIEW = path.join(DATA, "review", "salaries.md");

const SITE = "https://www.ontario.ca";
const INDEX_URL = `${SITE}/public-sector-salary-disclosure_artifacts/pssdfiles.json`;
const pageUrl = (year) =>
  `${SITE}/public-sector-salary-disclosure/${year}/all-sectors-and-seconded-employees/`;

const EMPLOYER = "town of ajax";
const TITLE_RE = /mayor|councillor/i;

// ---------- helpers ----------

const args = process.argv.slice(2).map(Number).filter(Boolean);
const FIRST_YEAR = args[0] ?? 2022;
const LAST_YEAR = args[1] ?? args[0] ?? 2025;

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

// Column names change from year to year ("Salary paid" vs "Salary",
// "JobTitle" vs "Job Title"...), so compare them with letters only.
const key = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const pick = (row, ...names) => {
  for (const [k, v] of Object.entries(row)) {
    if (names.includes(key(k))) return v;
  }
  return "";
};

function normalizeRow(raw) {
  return {
    status: pick(raw, "status"),
    last: pick(raw, "lastname"),
    first: pick(raw, "firstname"),
    salary: pick(raw, "salary", "salarypaid"),
    benefits: pick(raw, "benefits", "taxablebenefits"),
    employer: pick(raw, "employer"),
    title: pick(raw, "jobtitle"),
    year: pick(raw, "year", "calendaryear"),
  };
}

// The files are large (~50 MB); only parse lines that mention Ajax.
function ajaxRows(text) {
  const nl = text.indexOf("\n");
  const header = text.slice(0, nl);
  const lines = text
    .slice(nl + 1)
    .split("\n")
    .filter((l) => /ajax/i.test(l));
  return parseCsv([header, ...lines].join("\n"))
    .map(normalizeRow)
    .filter(
      (r) =>
        r.employer.trim().toLowerCase() === EMPLOYER && TITLE_RE.test(r.title)
    );
}

// "Rob Tyler-Morin" -> "rob tyler morin"
const normName = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();

const money = (s) => {
  const n = Number(String(s).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n.toFixed(2) : "";
};

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const personKey = (r) =>
  [normName(r.first), normName(r.last), r.title.toLowerCase(), r.year].join("|");

// ---------- matching ----------

const councillors = parseCsv(
  fs.readFileSync(path.join(DATA, "councillors.csv"), "utf8")
);

function matchCouncillor(first, last) {
  const full = normName(`${first} ${last}`);
  const exact = councillors.find((c) => normName(c.name) === full);
  if (exact) return { councillor: exact, how: "exact" };

  // Fallback: same last name, and one first name starts with the other
  // (e.g. "Rob" / "Robert"). Reported in the review file for checking.
  const f = normName(first).split(" ")[0];
  const l = normName(last);
  const partial = councillors.filter((c) => {
    const n = normName(c.name);
    if (!n.endsWith(" " + l)) return false;
    const cf = n.split(" ")[0];
    return cf.startsWith(f) || f.startsWith(cf);
  });
  if (partial.length === 1) return { councillor: partial[0], how: "partial" };
  return null;
}

// ---------- main ----------

async function main() {
  console.log(`Sunshine List: ${FIRST_YEAR}–${LAST_YEAR}`);
  const index = await (await get(INDEX_URL)).json();

  const results = []; // matched rows for salaries.csv
  const unmatched = [];
  const partial = [];
  const missingYears = [];
  const notes = [];

  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const files = index[String(year)];
    const compendium = files?.Compendium?.en?.csv;
    if (!compendium) {
      missingYears.push(year);
      console.log(`${year}: not published yet (expected spring ${year + 1})`);
      continue;
    }

    console.log(`${year}: downloading list…`);
    const records = new Map();
    for (const r of ajaxRows(await (await get(SITE + compendium)).text())) {
      records.set(personKey(r), r);
    }

    const addendum = files?.Addendum?.en?.csv;
    if (addendum) {
      console.log(`${year}: applying corrections…`);
      for (const r of ajaxRows(await (await get(SITE + addendum)).text())) {
        const k = personKey(r);
        const s = r.status.toLowerCase();
        if (s === "deletion") records.delete(k);
        else records.set(k, r); // "Addition" or "Changed"
        notes.push(
          `${year}: correction (${r.status}) for ${r.first} ${r.last}, ${r.title}`
        );
      }
    }

    for (const r of records.values()) {
      const m = matchCouncillor(r.first, r.last);
      const who = `${r.first} ${r.last} (${r.title}, ${year})`;
      if (!m) {
        unmatched.push(`${who}: salary ${money(r.salary)}, benefits ${money(r.benefits)}`);
        continue;
      }
      if (m.how === "partial") partial.push(`${who} → ${m.councillor.name} (\`${m.councillor.id}\`)`);
      results.push({
        councillor_id: m.councillor.id,
        year: String(year),
        salary: money(r.salary),
        taxable_benefits: money(r.benefits),
        source_url: pageUrl(year),
      });
    }
    console.log(`${year}: ${records.size} Ajax Mayor/Councillor record(s)`);
  }

  // Write salaries.csv
  const order = new Map(councillors.map((c, i) => [c.id, i]));
  results.sort(
    (a, b) => a.year.localeCompare(b.year) || order.get(a.councillor_id) - order.get(b.councillor_id)
  );
  const cols = ["councillor_id", "year", "salary", "taxable_benefits", "source_url"];
  const csv = [cols.join(","), ...results.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
  fs.writeFileSync(OUT_CSV, csv);

  // Write the review file
  const today = new Date().toISOString().slice(0, 10);
  const list = (items, empty) => (items.length ? items.map((i) => `- ${i}`).join("\n") : empty);
  const review = `# Salaries: items to review

Generated by \`scripts/fetch-salaries.mjs\` on ${today}, covering ${FIRST_YEAR}–${LAST_YEAR}.
It wrote ${results.length} row(s) to \`data/salaries.csv\`.

## Names that didn't match anyone in councillors.csv

These are Town of Ajax Mayor or Councillor entries on the Sunshine List that
were **not** added to salaries.csv. Usually this means the person isn't in
\`councillors.csv\` yet, or their name is spelled differently there. Add or fix
them in \`councillors.csv\` and run the script again.

${list(unmatched, "None. Every entry matched.")}

## Matched by partial name (please confirm)

${list(partial, "None.")}

## Years not published yet

The list for a year is published in spring of the following year.

${list(missingYears.map((y) => `${y} (expected spring ${y + 1})`), "None.")}

## Corrections applied from Ontario's addendum files

${list(notes, "None for Town of Ajax.")}

## Good to know

- The Sunshine List only includes people paid **$100,000 or more**. A member
  of council who isn't listed for a year was paid less than that by the Town.
  It doesn't mean they were paid nothing.
- Regional Councillors and the Mayor also sit on Durham Regional Council,
  which pays them separately. Only pay from the Town of Ajax is included here.
`;
  fs.mkdirSync(path.dirname(OUT_REVIEW), { recursive: true });
  fs.writeFileSync(OUT_REVIEW, review);

  console.log(`\nWrote ${results.length} row(s) to data/salaries.csv`);
  console.log(`Unmatched: ${unmatched.length}, partial matches: ${partial.length}`);
  console.log("See data/review/salaries.md");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
