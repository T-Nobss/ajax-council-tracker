# How this project was built, and how to build one for your municipality

This is a complete, step-by-step account of how the Ajax Council Tracker was
built: where every piece of data came from, how it was extracted and checked,
what went wrong along the way and how it was fixed, and what is still missing.

It is written for two kinds of readers:

- **Someone continuing this project** (adding a new year, a new term, the
  2026 campaign filings, and so on).
- **Someone building the same thing for another municipality.** Most Ontario
  municipalities publish the same kinds of records (minutes, budget books,
  remuneration statements, Form 4 campaign filings), so most of this applies
  directly. Section 9 lists what you will need to change.

You don't need to be a programmer to follow the data parts. The site itself
is a small Next.js app, and the extraction scripts are Python and Node. Every
command you need is given.

---

## Contents

1. [What the site is, and the rules it follows](#1-what-the-site-is-and-the-rules-it-follows)
2. [Tools and setup](#2-tools-and-setup)
3. [How the project is organized](#3-how-the-project-is-organized)
4. [The order things were built in](#4-the-order-things-were-built-in)
5. [Each dataset, step by step](#5-each-dataset-step-by-step)
   - 5.1 Terms, councillors and seats
   - 5.2 Salaries (Sunshine List)
   - 5.3 Budget (planned spending)
   - 5.4 Actual results (audited financial statements)
   - 5.5 Meetings and minutes
   - 5.6 Pay and expenses (Statement of Remuneration and Expenses)
   - 5.7 Motions, recorded votes and attendance
   - 5.8 Campaign finances (Form 4)
   - 5.9 Photos and design
6. [The website](#6-the-website)
7. [Checking your work](#7-checking-your-work)
8. [Technical challenges and how they were solved](#8-technical-challenges-and-how-they-were-solved)
9. [Adapting this to another municipality](#9-adapting-this-to-another-municipality)
10. [Limitations of this project](#10-limitations-of-this-project)
11. [Keeping it up to date (yearly calendar)](#11-keeping-it-up-to-date-yearly-calendar)

---

## 1. What the site is, and the rules it follows

The Ajax Council Tracker shows, for Ajax Town Council (Ontario):

- who sat on Council in each term (2014–2018, 2018–2022, 2022–2026, 2026–2030)
- each member's pay (two sources) and expenses, by year
- every motion in the Council and General Government Committee minutes, with
  named ("recorded") votes, attendance, and filters
- the Town's planned budget, actual audited results, and the budget documents
- each member's 2022 election campaign finances: totals and donors over $100

The rules below came up again and again. They are the most important part of
this guide. If you build your own version, keep them.

1. **Public records only.** Every number comes from a document published by
   the Town, the Province or another public body, and every number links back
   to its source. A copy of each source document is kept in `sources/`.
2. **Never guess.** If a number is unclear, blank or contradictory, record it
   exactly as written (or leave it blank) and write it down in a review file.
   Never fill a gap with a figure that "must" be right.
3. **Official totals win.** When a document has a total (a budget book's
   total page, a statement's Total row, a Form 4's line 1B), the extracted
   rows must add up to it. If they don't, find out why and explain it.
4. **Every extraction writes a review file** in `data/review/` listing what
   was checked, what matched, and anything a person should look at.
5. **Explain differences where readers see them.** When two official numbers
   legitimately disagree (for example, two pay reports that measure different
   things), the site says so behind an "i" button next to the numbers.
6. **Privacy.** Campaign donors: name, town and amount only. **Never street
   addresses or postal codes**, even though the forms include them. Only
   donors over $100 are named (smaller donations appear only as a total).
7. **Independence.** The site says it is independent and not affiliated with
   the Town. It uses colours inspired by the Town's branding but **not** the
   Town's logo. Councillor photos are official headshots, credited; no photos
   from personal social media.
8. **The owner isn't a programmer.** All data lives in CSV files that open in
   Excel or Google Sheets, and the README explains each one in plain
   language. No database.

---

## 2. Tools and setup

### Software

| Tool | Used for | Install |
|---|---|---|
| Node.js 20+ | the website (Next.js 16, React 19) and the salary script | nodejs.org |
| Python 3.9+ | all other extraction scripts | python.org |
| `pypdf` (Python) | reading PDF bookmarks, cutting single agenda items out of big PDFs | `pip install pypdf` |
| poppler-utils (`pdftotext`, `pdftoppm`, `pdfinfo`) | text from PDFs; rendering pages as images | `apt install poppler-utils` / `brew install poppler` |
| tesseract | OCR for scanned minutes | `apt install tesseract-ocr` / `brew install tesseract` |
| Pillow (Python) | cropping, rotating and checking scanned pages | `pip install pillow` |
| Playwright + Chromium | screenshots and checks of the built site | `npm i -D playwright` |
| Git + a GitHub account | version history; Vercel deploys from GitHub | |
| Vercel (free tier) | hosting; rebuilds automatically on every push to `main` | vercel.com |

### Running the site locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. To check a production build:

```bash
npm run build
```

### Hosting

The GitHub repository is connected to Vercel. Every push to `main` rebuilds
and publishes the site; nothing else is needed. The site is fully static
(every page is built ahead of time from the CSV files).

### Network access (if you work in a sandbox or behind a firewall)

This project was built in a sandboxed cloud environment where every website
had to be allowed by name. The hosts that were needed:

| Host | Why |
|---|---|
| `ajax.ca`, `www.ajax.ca` | Town website: budget books, financial statements, election pages, Form 4 PDFs |
| `ajax.cityconnections.civicflow.co` | the Town's meeting portal (agendas, minutes) |
| `data.ontario.ca`, `files.ontario.ca`, `www.ontario.ca` | Sunshine List files |
| `globalnews.ca` | 2018 and 2022 election results |
| `en.wikipedia.org` | 2014 election results (Durham Region municipal elections) |
| `commons.wikimedia.org`, `upload.wikimedia.org` | freely licensed local photos |

If you are behind a proxy, Node's `fetch` ignores the proxy unless you run it
with `NODE_USE_ENV_PROXY=1` (see section 8).

---

## 3. How the project is organized

```
app/                 the website (Next.js App Router)
  page.js              Home
  councillors/         list (term filter) and one profile per councillor
    [id]/              Seats, Salary, Expenses, Votes, Election campaigns sections
  votes/               all motions with filters; one page per meeting
  spending/            Planned / Actual / Documents tabs (/budget redirects here)
  credits/             About and photo credits
  components/          shared pieces (InfoHeading = heading with an "i" note,
                       ShowMore = "See more" lists, Avatar, Nav, WardChangeNote…)
lib/data.js          reads the CSV files and joins them (the only data layer)
data/*.csv           ALL the data the site shows
data/review/*.md     what each extraction checked, and what needs a human look
scripts/             extraction scripts (one per data source)
sources/             copies of every source document, by type and year
docs/                this guide
README.md            plain-language guide to the data files (for the owner)
```

### The data files and how they connect

Everything is joined by short IDs:

- `terms.csv` → `id` like `2022-2026`
- `councillors.csv` → `id` like `sterling-lee` (lowercase, hyphens), plus an
  `aliases` column: every spelling of the person's name found in documents,
  separated by `;` (including OCR errors and typos such as "Councillor Knan"
  for Khan). This is what lets scripts match names reliably.
- `seats.csv` links a councillor to a term with a role and ward.
- `meetings.csv` → `id` like `2024-03-18-council`
- `motions.csv` → `id` like `2024-03-18-council-m07` (meeting id + number)
- `votes.csv` and `attendance.csv` link a councillor to a motion / meeting.
- `salaries.csv`, `expenses.csv` link a councillor to a year.
- `campaigns.csv` → `id` like `2022-sterling-lee`; `donations.csv` and
  `campaign_documents.csv` link to a campaign.

The README has a full table of every file and column.

---

## 4. The order things were built in

The whole project was built in about two days of work. The order matters,
because later steps depend on earlier ones (every script needs the
councillor IDs and aliases).

1. **Skeleton site** with empty CSV files (headers only), a home page,
   placeholder pages and a plain-language README. Pushed to a new GitHub repo
   and connected to Vercel.
2. **Current term and members** from the Town's "Meet Council" page →
   `terms.csv`, `councillors.csv`, `seats.csv`. Built the Councillors list
   (term filter, newest term with members as the default) and profile pages.
3. **Salaries** from the Sunshine List (script), shown on profiles with notes
   behind an "i" button.
4. **The newly elected 2026–2030 council** from the certified election results
   PDF; then **2018–2022** from the Town's election pages and Global News;
   later **2014–2018** from Wikipedia.
5. **Budget** books (2023–2026) → script, review, then the Budget page.
   The department-vs-town-wide difference was investigated and explained in a
   note.
6. **Actual results** (audited financial statements) and the budget documents;
   the Budget page became **Spending** with Planned / Actual / Documents tabs.
7. **Meetings**: a script that walks the Town's meeting portal, saves minutes,
   and finds the yearly remuneration reports inside agenda packages.
8. **Pay and expenses** from the remuneration statements, moved onto profiles
   (pay into Salary, everything else into Expenses).
9. **Redesign** with Ajax-inspired colours, local photos and official
   councillor headshots.
10. **Motions and votes** from all minutes: first 3 test meetings checked by
    hand, then all text-based minutes, then OCR for 45 scanned ones.
11. Profile refinements (split votes with "See more"), the 2014 council, the
    2018 ward-boundary note, a much better Votes filter, procedural flags,
    attendance, [sic] markers.
12. **Campaign finances (2022 Form 4)**: one filing first (Sterling Lee) for
    the owner to check the approach, then the other seven.

**Tip:** do one small sample first for every new data type (3 meetings, 1
campaign filing) and check it by hand before running everything. Every major
extraction in this project was done this way, and each sample caught at least
one rule that needed changing.

---

## 5. Each dataset, step by step

### 5.1 Terms, councillors and seats

**Sources**

- Current council: the Town's "Meet Council" page (ajax.ca).
- 2026 election: the Town's certified election results PDF.
- 2018 and 2022: the Town's election results pages and Global News coverage.
- 2014: Wikipedia's page on the 2014 Durham Region municipal elections.

**Steps**

1. Add each term to `terms.csv` with exact start and end dates
   (Ontario terms start November 15 after the election).
2. Add each person once to `councillors.csv`. Their `id` never changes.
3. Add one row per person per term to `seats.csv` (role and ward).
4. Use consistent role names. Ajax uses "Mayor", "Regional Councillor" and
   "Local Councillor"; some sources say "City Councillor" or "Councillor" —
   standardize in `seats.csv`, but in campaign data keep what the form says.
5. Fill in `aliases` as you meet new spellings in documents.

**Things to know**

- **Ward boundaries changed in 2018** (four wards before, three after). A
  2014–2018 "Ward 2" isn't the same area as today's Ward 2. The site shows a
  note wherever the 2014–2018 term appears.
- The Councillors list defaults to the newest term that has members, so adding
  a new council makes it the default automatically.

### 5.2 Salaries (Sunshine List)

**Source:** Ontario's Public Sector Salary Disclosure ("Sunshine List"):
everyone paid $100,000 or more. Files for 2021 onward are indexed on
ontario.ca; earlier years are in the data.ontario.ca catalogue. Each year has a
main file and sometimes an "Addendum" with corrections.

**Script:**

```bash
npm run salaries
```

```bash
npm run salaries -- 2019 2026
```

`scripts/fetch-salaries.mjs` downloads each year, applies the addendum,
filters to the Town of Ajax employer and Mayor/Councillor job titles, matches
names through `aliases`, and writes `data/salaries.csv` plus
`data/review/salaries.md` (unmatched names, partial matches, corrections
applied, years not yet published).

**Things to know**

- Many councillors are **under $100,000** and never appear. The site says
  "Under $100k" for years the list was checked and they weren't on it. A year
  counts as checked if it falls between the first and last year collected,
  even if no council member was on that year's list (2018, for example).
- The Mayor's and Regional Councillors' Sunshine List amounts jump from 2024.
  In December 2022 Council agreed the Town would pay the Region of Durham's
  share and be reimbursed, so from 2024 those amounts likely include Regional
  pay. This is explained in the Salary note on profiles, with a link to the
  meeting.

### 5.3 Budget (planned spending)

**Source:** the Town's annual operating and capital budget books (PDF) on
ajax.ca, saved to `sources/budgets/`.

**Script:**

```bash
python3 scripts/extract_budget.py
```

It reads each department's "BUDGET BY DRIVER" page (gross expenditure,
revenue, net), the capital project lists, and checks totals against the
book's own summary pages. Output: `data/budget.csv`,
`data/capital_projects.csv`, `data/review/budget.md`.

**The discrepancy, and how it was handled:** the departments' net totals match
the book exactly, but their gross spending and revenue are higher than the
book's town-wide page, by $103,600 to $192,300 depending on the year. The
difference was traced line by line (library revenue and debt, and internal
costs and recoveries that are shown inside departments but netted out
town-wide). The breakdown is stored in `data/budget_reconciliation.csv` and
shown as an "i" note on the Spending page. Never "fix" a difference like this
by adjusting numbers; explain it.

### 5.4 Actual results (audited financial statements)

**Source:** the Town's audited consolidated financial statements (2023–2025),
saved to `sources/financial-statements/`.

```bash
python3 scripts/extract_actuals.py
```

It reads the Consolidated Statement of Operations (revenue by source,
expenses by function, budget vs actual) and checks every column against the
statement's totals and annual surplus, and each year's prior-year column
against the earlier statement. Output: `data/actuals.csv`,
`data/review/actuals.md`.

**Things to know:** audited statements use public-sector accounting
(amortization, consolidated entities), so they **don't match the budget
book**. They're shown on a separate "Actual" tab with a note saying so, rather
than side by side with the budget.

### 5.5 Meetings and minutes

**Source:** the Town's meeting portal, City Connections / civicflow
(`ajax.cityconnections.civicflow.co/p/town-of-ajax`). The older site
(`events.ajax.ca`) no longer exists; meetings were migrated to the portal.

```bash
python3 scripts/fetch_meetings.py
```

```bash
python3 scripts/fetch_meetings.py 2018-2022
```

For every Council, Special Council, General Government Committee (GGC) and
Special GGC meeting in the term, it adds a row to `data/meetings.csv`, saves
the minutes PDF to `sources/minutes/`, and searches agenda item titles,
attachment names and the agenda PDF's bookmarks for "Remuneration". When it
finds the yearly remuneration report, it saves **only those pages** to
`sources/expenses/` (agenda packages can be hundreds of pages). It's safe to
re-run; it skips files it already has. It pauses between requests.

Check `data/review/meetings.md` for meetings with no minutes on the portal.

**Document links** use the portal's document viewer:
`/p/town-of-ajax/documents/meeting/<id>?f=0#page=N`.

### 5.6 Pay and expenses (Statement of Remuneration and Expenses)

**Source:** each spring the Treasurer reports every member's pay and
expenses for the previous year (Municipal Act, section 284, due by March 31).
It goes to a GGC meeting; the meetings script saves it.

```bash
python3 scripts/extract_expenses.py
```

It reads Table A (one row per member, one column per category) and checks
every column against the Total row. Payments from other bodies (Elexicon,
the Library Board, etc.) are recorded separately and shown as "Paid by other
organizations". Output: `data/expenses.csv`, `data/review/expenses.md`.

**On the site:** "Remuneration/Benefits" goes in the Salary section (next to
the Sunshine List figure, with an explanation of why the two differ); every
other category goes in Expenses.

**2018** was a scanned table the script couldn't read reliably, so it was
typed in by hand to `data/expenses_manual.csv` (with page links) and checked
against the Total row.

### 5.7 Motions, recorded votes and attendance

**Source:** the minutes PDFs from 5.5. Most have a text layer; 45 were
scanned images.

1. OCR the scanned ones (only needed once per file):

   ```bash
   scripts/ocr_minutes.sh
   ```

   This renders each page with `pdftoppm` and runs `tesseract`, writing text
   to `sources/minutes-text/`.

2. Extract:

   ```bash
   python3 scripts/extract_motions.py
   ```

**How the minutes are read** (Ajax's format; yours may differ):

- A motion starts at "Moved by: <name>", then "Seconded by: <name>", the
  motion text, and a result line (CARRIED, LOST, DEFEATED, WITHDRAWN,
  REFERRED, CARRIED on 2/3rds…).
- The agenda item is the nearest heading above it.
- A **recorded vote** lists names under "In Favour" and "Opposed". Only these
  have named votes; most motions are decided without names being recorded.
- **Attendance** comes from the "Present" / "Regrets" lists at the top.

**Checks built into the script** (results in `data/review/votes.md`):

- every name must match a member sitting on the meeting date (through
  `aliases`)
- In Favour + Opposed can't exceed the number of members (7 in Ajax)
- nobody can be on both sides
- a CARRIED result should have more in favour than opposed
- a coverage table by year (meetings, minutes files, motions, recorded votes)
- missing minutes, names that didn't match, failed checks

**Extra fields:**

- `procedural`: adjournment, going into closed session, the confirming
  by-law. Hidden by default on the Votes page. (Ajax's minutes have no
  separate "approve the agenda" motion.)
- **[sic]**: where the Town's minutes contradict the agenda item (for
  example a 2026 report dated "March 9, 2025"), the text is kept as written
  and marked [sic]. Only applied to text-based minutes, never to OCR text,
  where the "error" might be the OCR's.
- **Absent / Didn't vote** on recorded votes, from the attendance list.

### 5.8 Campaign finances (Form 4)

**Source:** each candidate's *Financial Statement – Auditor's Report,
Form 4* (Municipal Elections Act, s. 88.25), posted on the Town's elections
page. Saved to `sources/campaigns/<year>/`. Related documents (e.g. a
Compliance Audit Committee decision) go in `sources/campaigns/decisions/`.

These are scanned and every filing is different, so **they are read by eye,
page by page, and typed in.** There is no script. This is the slowest part
of the project.

**The rules (agreed with the owner):**

1. Read every page, including rotated pages and attachments. The donor list
   is often an attachment ("per list", "see attached worksheet") rather than
   Table 3.
2. The Form 4 figures are official. Each candidate's donor rows should add up
   to **line 1B** (contributions over $100). If an attached list doesn't
   match, look for handwritten corrections or crossed-out entries, follow
   them, and explain the reconciliation in `data/review/campaigns.md`.
3. Only list donors whose **total** contribution is over $100. If a donor
   appears twice, combine them (and flag it).
4. Record the donor's town **as written**. If it conflicts with the postal
   code (e.g. "Ajax" with a Toronto postal code), keep it as written and put a
   note in the `flag` column (flags are not shown on the site).
5. Mark candidates who lost as `unsuccessful`.
6. Link related official documents with their official title only; don't
   summarize them.
7. A blank line on the form stays blank (it shows as a dash).

**Step by step, for each filing:**

1. Find the content pages. Scanned double-sided filings have blank backs;
   check the amount of ink per page (section 8) instead of reading 20 pages.
2. Box A: office, ward, campaign period, the three limits.
3. Box C: income lines, expense subtotals C2 (general limit), C3 (parties and
   appreciation), C4 (not subject to limits), total C5, and Box D
   surplus/deficit. **Add the expense lines up yourself** and compare with the
   subtotals.
4. Schedule 1 Part I: candidate's money, candidate's goods (e.g. signs from
   the last campaign), contributions of $100 or less, contributions over $100
   (1B), total (1A). Check they add up to 1A.
5. Table 3 or the attachment: transcribe name, town (from the address) and
   amount. Use a high-resolution render and crop for small print (section 8).
6. Add up the donor rows and compare with 1B.
7. Note the auditor (name, firm). Required over $10,000.
8. Write it all in `data/review/campaigns.md`: page map, every check, every
   oddity, every flag.

**What came up in the eight 2022 Ajax filings** (all explained in the review
file):

| Situation | Example | What was done |
|---|---|---|
| Donor list as an attachment | Lee ("per list"), Tyler Morin, Collier (5-page sideways worksheet), Bower (supplementary page) | Read the attachment |
| Handwritten corrections | Lee: three small donations crossed out, "+130", "$22,350" written in | Followed them; documented the reconciliation |
| **$100 donations counted in line 1B** | Lee (six, $600), Tyler Morin (one, $100), Collier (four, $400) | Kept rule 3 (not listed), so rows are less than 1B; the gap is explained behind an "i" on the profile (`donations_note`) and in the README. *This was the owner's decision.* |
| Same donor twice | Collier: Daniel Drimmer, 2 × $500 | Combined into one $1,000 row, flagged |
| Joint donors | "Ed and Jill Boddy", "Michael/Brenda McLean" | One row, as written |
| Town vs postal code | "Ajax" with Toronto, Thornhill or Pickering codes | Kept as written, flagged |
| Blank lines | Crawford's spending limits and surplus line | Left blank |
| Odd figures | Dies' parties limit written as $350.00 (should be about $3,078.65) | Recorded as written, noted |
| Internal inconsistency | Bower: $9,960.00 in Box C vs $9,960.08 in Schedule 1 | Used Schedule 1 line 1A, noted |
| Campaign periods past Dec 31 | Henry and Khan to 2023/01/03 | Recorded as written |
| Typos in auditor reports | Khan's auditor: "May 4, 2023 to January 3, 2023" | Noted, not corrected |
| Pages missing | Henry's form is numbered "of 8" but page 8 isn't in the posted file | Noted |

**On the site:** each profile has an "Election campaigns" section (after
Votes): totals table, donors over $100 (largest first, with town), an "i"
note where rows don't match 1B, related documents, and the source link.

### 5.9 Photos and design

- Colours inspired by the Town's branding (navy `#1c2a56`, gold `#f0a123`,
  red `#ce312b`, Poppins font). **No Town logo.**
- Local scenery from Wikimedia Commons (freely licensed), credited on the
  Credits page (`data/photos.csv`).
- Councillor portraits: official Town headshots, credited
  (`data/councillor_photos.csv`). No social media photos. Members with no
  official photo get an initials avatar.

---

## 6. The website

- **Next.js App Router, plain JavaScript and CSS.** No database, no CMS.
  `lib/data.js` reads the CSVs at build time, and every page is static.
- **Pages:** Home; Councillors (term filter, shareable `?term=` URL);
  Councillor profile (Seats, Salary, Expenses, Votes, Election campaigns);
  Votes (filters by term, year, month, type, result, member, text search,
  split votes only, hide procedural; all in the URL so filtered views can be
  shared); one page per meeting; Spending (Planned / Actual / Documents);
  Credits.
- **Notes behind "i" buttons** (`InfoHeading`) explain every number that
  needs context. Long lists use "See more" (`ShowMore`).
- **Redirects** in `next.config.mjs`: `/budget` → `/spending`, `/expenses` →
  `/councillors`.
- **Testing:** after each change, build, start the site and take Playwright
  screenshots at desktop and phone widths. Check that nothing scrolls
  sideways on a phone.

---

## 7. Checking your work

Every data type was checked in at least one of these ways:

1. **Totals:** extracted rows add up to the document's own totals (budget
   pages, Total rows, statement totals, Form 4 lines 1A and 1B, C2–C5).
2. **Cross-checks:** a year's figures repeated in the next year's document
   (actuals); Sunshine List vs Town report (explained, not forced to match).
3. **Sanity rules:** vote counts, both-sides votes, members actually sitting
   on the date.
4. **A human sample** before running everything.
5. **Review files** in `data/review/` that a person reads after every run.

When a check fails, there are three acceptable outcomes: (a) the extraction
was wrong, so fix the script; (b) the document is wrong or inconsistent, so
record it as written and note it; (c) the difference is real and explainable,
so explain it on the site. Never adjust a number to make a check pass.

---

## 8. Technical challenges and how they were solved

### Data sources and access

| Challenge | Resolution |
|---|---|
| The Town's old meeting site (`events.ajax.ca`) was gone | Found the new portal (City Connections / civicflow). Its pages are a Next.js app, so the script reads the meeting data embedded in the page (React Server Components payload) rather than HTML tables. |
| Meetings were being migrated to the portal in 2026; some older meetings have no minutes | The script is safe to re-run and lists missing minutes in `data/review/meetings.md`. |
| Remuneration reports are buried in agenda packages of hundreds of pages | The script reads the agenda PDF's bookmarks and saves only the matching item's pages. |
| The sandbox only allowed named websites | Each needed host was added to the environment's allow-list (section 2). Adding `durhamregion.com` was refused, so the article cited for the 2018 ward change couldn't be read; it is cited, but its content wasn't verified. `elections.ajax.ca` and `web.archive.org` were also blocked (see Limitations). |
| Node's `fetch` ignored the proxy | Run Node with `NODE_USE_ENV_PROXY=1`. |
| Wikimedia rate-limited image downloads | Downloaded slowly with pauses. One photo (Carruthers Creek) never downloaded and isn't used. |
| The ajax.ca site moved (old `/en/…aspx` pages return 403) | Used the new WordPress URLs (`ajax.ca/wp-content/uploads/…`); the site's search (`/?s=`) helped find documents. |

### PDFs and OCR

| Challenge | Resolution |
|---|---|
| 45 minutes files were scanned images | `scripts/ocr_minutes.sh` (`pdftoppm` + `tesseract`). |
| OCR stalled, with all CPU cores busy | Tesseract's internal threading multiplied with parallel jobs. Setting `OMP_THREAD_LIMIT=1` fixed it. Temporary images go in a dedicated folder (`OCR_TMP`), not a shared `/tmp`. |
| OCR misread names ("Councillor Knan", "Regional Council Crawford", "R. Taylor Morin") | Added every variant to the `aliases` column instead of fixing the OCR text. |
| The 2018 remuneration statement couldn't be read reliably | Typed in by hand (`expenses_manual.csv`) and checked against its Total row. |
| Form 4 filings: rotated pages, blank backs, tiny print, handwriting | Rendered pages with `pdftoppm`, counted dark pixels per page to skip blank backs, rotated and cropped high-resolution renders (200–250 dpi, split in halves) to read small print, and read every content page by eye. The PDFs' text layers (auto-OCR) were used only as a guide and never trusted for numbers. |

### Parsing the minutes

| Challenge | Resolution |
|---|---|
| A numbered clause inside a motion ("13.2. No provision…") was taken for a new agenda heading, cutting a motion in two | Headings must also look like titles (`title_like()`), not just start with a number. |
| The "closed session" procedural rule caught non-procedural motions (adopting closed-session minutes, ratifications) | Procedural flags use the motion's own text only, with narrow rules. |
| The word "Chair" blocked vote lines like "Chair Tyler Morin" | Only "resumed/assumed the Chair" is skipped; "Chair X" is matched as a name. |
| Attendance lists had typos, so someone who voted looked absent | Anyone with a recorded vote is counted as present; these cases are listed in the review file. |
| One motion lists the same member as both Yes and No (2025-12-08 GGC) | No vote is recorded for that member on that motion; listed under failed checks. |
| The Town's minutes contain wrong dates (e.g. a 2026 report called "March 9, 2025") | Kept as written with [sic]; only applied to text-based minutes, not OCR. |
| 2024 has no named votes at all | Confirmed: all 23 meetings were parsed and "In Favour" never appears in 2024 minutes. Documented, with a coverage table by year. |

### Data interpretation

| Challenge | Resolution |
|---|---|
| Budget departments don't add up to the town-wide page | Traced the difference (library, internal costs and recoveries) and showed the explanation in a note. |
| Two pay sources that never match | Showed both side by side with an explanation (different definitions; the Sunshine List covers only $100,000+). |
| Regional pay folded into Town pay from 2024 | Explained with a link to the December 2022 decision. |
| Form 4: $100 donations put on line 1B | Owner's decision: don't list them; explain the gap on the site and in the README. |

### Working process

| Challenge | Resolution |
|---|---|
| Long extractions could be interrupted (session limits, timeouts) | Scripts skip finished work, and progress was committed in "checkpoint" commits. |
| Local test servers clashed on ports between runs | Stop old servers (`pkill -f "next start"`) and use a new port for each test run. |
| Keeping a non-technical owner in control | Sample first, review files after every run, decisions about rules made by the owner and written into the README. |

---

## 9. Adapting this to another municipality

Most of the site can be reused as is. What you'll need to change:

1. **Branding and wording:** site name, colours (`app/globals.css`),
   "independent" footer, Home page text, photos and credits.
2. **Data:** empty the CSVs (keep the header rows) and start with
   `terms.csv`, `councillors.csv` (with `aliases`) and `seats.csv`.
3. **Roles and council size:** Ajax has a Mayor, 3 Regional and 3 Local
   Councillors (7 votes). Change `COUNCIL_SIZE` in
   `scripts/extract_motions.py` and the sort order of roles in
   `app/councillors/CouncillorList.js`.
4. **Salaries:** in `scripts/fetch-salaries.mjs`, change the employer name
   ("Town of Ajax") and the job titles.
5. **Meetings:** if your municipality uses a different portal (eScribe,
   iCompass/Diligent, Granicus…), `scripts/fetch_meetings.py` must be
   rewritten for it. Keep its outputs the same (`meetings.csv`, minutes in
   `sources/minutes/`, the review file) and the rest still works. Also change
   the meeting types (Ajax uses Council and General Government Committee).
6. **Minutes format:** `scripts/extract_motions.py` is written for Ajax's
   "Moved by / Seconded by / In Favour / Opposed" format and section names.
   Run it on 3 meetings, compare with the PDFs by hand, and adjust the
   patterns until they match before running everything.
7. **Budget books** differ a lot between municipalities. Expect to rewrite
   the page-finding part of `scripts/extract_budget.py`; keep the totals checks.
8. **Remuneration statements** (s. 284) vary in layout; adjust the column
   names in `scripts/extract_expenses.py`.
9. **Form 4** is a provincial form, so the campaign section and rules apply
   to any Ontario municipality without changes.
10. **Upper-tier pay:** if your councillors also sit on a regional or county
    council, look into how that pay is reported (see 5.2).

---

## 10. Limitations of this project

Be clear with readers about what isn't covered.

**Time span**

- **Nothing before the 2014–2018 term.** No earlier councils, votes, pay or
  campaigns.
- **The 2014–2018 term has membership only** (plus the Mayor's Sunshine List
  pay for 2016–2017). No motions, votes, attendance or expenses for that term; the
  minutes collected start in December 2018.
- **Expenses** start in 2018; **budget** covers 2023–2026; **actual results**
  2023–2025; **salaries** (Sunshine List) cover 2016–2025 but only list
  members paid $100,000+.

**Campaign finances**

- **2018 campaign filings (Form 4) could not be found.** The Town's elections
  page now only posts the 2022 statements; the old 2018 election pages no
  longer load. Two possible sources couldn't be reached from the build
  environment: the Town's election site (`elections.ajax.ca`) and the
  Internet Archive (`web.archive.org`). The Clerk is required to provide
  campaign financial statements electronically, free, on request, so the
  Clerk's office is the next place to ask (they may no longer have them).
- **2014 and earlier campaigns** weren't attempted.
- **2022 filings only cover members of Council (and Ashmeed Khan,** who held
  a seat in 2018–2022 and lost in 2022). Other 2022 candidates' filings are on
  the Town's page but weren't extracted.
- **2026 filings** aren't due until 2027.
- Donors of $100 or less are never named. In three filings, $100 donations
  were counted in line 1B, so those candidates' listed donors add up to less
  than 1B (explained on the site).
- Form 4 data is typed in by hand from scans; a transcription error is
  possible, though every filing's totals were checked.
- The Compliance Audit Committee decision on Nancy Henry is linked by title
  only. Its one-line description is still to be added by the owner.

**Votes**

- Names are only known for **recorded votes** (when a member asks for one).
  Most motions are decided without names.
- **2024 has no recorded votes**; none appear in that year's minutes.
- Some meetings have no minutes on the portal (listed in
  `data/review/votes.md`); one 2024 GGC month (April) doesn't appear at all.
- 45 meetings were read with OCR, which can misread words.
- Only Council and General Government Committee meetings are covered (not
  other committees or boards).

**Other**

- The 2018 ward-change note cites a Durham Region article that couldn't be
  opened from the build environment, so its content wasn't checked.
- The Sunshine List and the Town's own report measure pay differently and
  will never match exactly.

---

## 11. Keeping it up to date (yearly calendar)

| When | What | How |
|---|---|---|
| Every month or two | New meetings, minutes, motions and votes | `python3 scripts/fetch_meetings.py`, then `scripts/ocr_minutes.sh` (if any are scanned), then `python3 scripts/extract_motions.py`; read `data/review/votes.md` |
| Spring (March–April) | Last year's pay and expenses | The remuneration statement goes to a GGC meeting; re-run the meetings script, then `python3 scripts/extract_expenses.py` |
| Spring (March) | Sunshine List | `npm run salaries -- <year>` |
| Winter (budget season) | New budget book | Save it in `sources/budgets/`, run `python3 scripts/extract_budget.py` |
| Summer–fall | Audited financial statements | Save in `sources/financial-statements/`, run `python3 scripts/extract_actuals.py` |
| After each election | New term, members, seats | Edit `terms.csv`, `councillors.csv`, `seats.csv` |
| Spring after each election | Campaign filings (Form 4) | By hand, following section 5.8 |

After any change: read the review file, run `npm run build`, look at the
affected pages, then commit and push. Vercel publishes automatically.
