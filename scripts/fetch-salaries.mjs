// Builds data/salaries.csv from Ontario's Public Sector Salary Disclosure
// (the "Sunshine List").
//
//   npm run salaries                # years 2019–2025
//   npm run salaries -- 2026        # just one year
//   npm run salaries -- 2019 2026   # a range (first and last year)
//
// What it does:
//   1. Finds each year's Sunshine List files: 2021 onward from Ontario's
//      index on ontario.ca, earlier years from the data.ontario.ca catalogue.
//   2. Downloads each year's main list ("Compendium") and, if there is one,
//      its correction file ("Addendum": additions, changes and deletions).
//   3. Keeps rows where the employer is the Town of Ajax and the job title
//      contains "Mayor" or "Councillor".
//   4. Matches each person to a name in data/councillors.csv.
//   5. Updates data/salaries.csv: rows for the years it ran are replaced,
//      rows for other years are kept. Writes data/review/salaries.md, which
//      lists anything from this run that needs a human to check.
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

// Years before 2021 live in the provincial open data catalogue.
const CATALOGUE = "https://data.ontario.ca";
const cataloguePage = (year) =>
  `${CATALOGUE}/dataset/public-sector-salary-disclosure-${year}`;

const EMPLOYER = "town of ajax";
const TITLE_RE = /mayor|councillor/i;

// ---------- helpers ----------

const args = process.argv.slice(2).map(Number).filter(Boolean);
const FIRST_YEAR = args[0] ?? 2019;
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

// Where to download one year's files from, and what to link to as the source.
// Returns null if that year hasn't been published.
async function findFiles(index, year) {
  const files = index[String(year)];
  if (files?.Compendium?.en?.csv) {
    return {
      compendium: SITE + files.Compendium.en.csv,
      addendum: files.Addendum?.en?.csv ? SITE + files.Addendum.en.csv : null,
      source: pageUrl(year),
    };
  }

  const res = await fetch(
    `${CATALOGUE}/api/3/action/package_show?id=public-sector-salary-disclosure-${year}`
  );
  if (!res.ok) return null;
  const pkg = (await res.json()).result;
  // English files are named like en-2019-pssd-compendium.csv,
  // en-2019-pssd-addendum.csv (older years: en-2015-pssd.csv).
  const english = (pkg?.resources ?? [])
    .map((r) => r.url)
    .filter((u) => /\/en-\d{4}-pssd[^/]*\.csv$/i.test(u));
  const compendium = english.find((u) => !/addendum|no-salar|dictionary/i.test(u));
  if (!compendium) return null;
  return {
    compendium,
    addendum: english.find((u) => /addendum/i.test(u)) ?? null,
    source: cataloguePage(year),
  };
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
    const files = await findFiles(index, year);
    if (!files) {
      missingYears.push(year);
      console.log(`${year}: not published yet (expected spring ${year + 1})`);
      continue;
    }

    console.log(`${year}: downloading list…`);
    const records = new Map();
    for (const r of ajaxRows(await (await get(files.compendium)).text())) {
      records.set(personKey(r), r);
    }

    if (files.addendum) {
      console.log(`${year}: applying corrections…`);
      for (const r of ajaxRows(await (await get(files.addendum)).text())) {
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
        source_url: files.source,
      });
    }
    console.log(`${year}: ${records.size} Ajax Mayor/Councillor record(s)`);
  }

  // Update salaries.csv: keep rows for years outside this run.
  const ranYears = new Set();
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    if (!missingYears.includes(y)) ranYears.add(String(y));
  }
  const kept = fs.existsSync(OUT_CSV)
    ? parseCsv(fs.readFileSync(OUT_CSV, "utf8")).filter((r) => !ranYears.has(r.year))
    : [];
  const written = results.length;
  results.push(...kept);
  const order = new Map(councillors.map((c, i) => [c.id, i]));
  results.sort(
    (a, b) => a.year.localeCompare(b.year) || (order.get(a.councillor_id) ?? 1e9) - (order.get(b.councillor_id) ?? 1e9)
  );
  const cols = ["councillor_id", "year", "salary", "taxable_benefits", "source_url"];
  const csv = [cols.join(","), ...results.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
  fs.writeFileSync(OUT_CSV, csv);

  // Write the review file
  const today = new Date().toISOString().slice(0, 10);
  const list = (items, empty) => (items.length ? items.map((i) => `- ${i}`).join("\n") : empty);
  const review = `# Salaries: items to review

Generated by \`scripts/fetch-salaries.mjs\` on ${today}, covering ${FIRST_YEAR}–${LAST_YEAR}.
It wrote ${written} row(s) for these years to \`data/salaries.csv\` (the file now has
${results.length} row(s) in total; other years were left as they were).

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

  console.log(`\nWrote ${written} row(s) for ${FIRST_YEAR}–${LAST_YEAR}; salaries.csv now has ${results.length} row(s)`);
  console.log(`Unmatched: ${unmatched.length}, partial matches: ${partial.length}`);
  console.log("See data/review/salaries.md");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
