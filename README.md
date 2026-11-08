# Ajax Council Tracker

A simple website showing voting records, expenses and budgets for Ajax Town
Council (Ontario), built from public records.

There is no database. **Everything the site shows comes from the spreadsheet
files in the `data` folder.** To update the site, you edit those files.

---

## How the data folder works

The `data` folder holds seven CSV files. A CSV file is just a spreadsheet saved
in a plain format. You can open and edit them in Excel, Google Sheets, Numbers,
or any text editor.

- The **first row** of each file is the column headings. Don't change or
  delete it.
- **Each row after that is one record** (one councillor, one meeting, one
  vote, and so on).
- When you save from a spreadsheet program, choose **"CSV"** format
  (in Excel: *CSV UTF-8*).

### The files and what goes in them

| File | One row is… | Columns |
|---|---|---|
| `terms.csv` | a term of council (e.g. 2022–2026) | `id`, `name`, `start_date`, `end_date` |
| `councillors.csv` | a person who has served on council | `id`, `name` |
| `seats.csv` | a person's seat during one term | `councillor_id`, `term_id`, `role`, `ward` |
| `meetings.csv` | a council meeting | `id`, `term_id`, `date`, `type`, `minutes_url` |
| `motions.csv` | a motion voted on at a meeting | `id`, `meeting_id`, `item`, `text`, `mover`, `seconder`, `result`, `recorded_vote`, `procedural` |
| `votes.csv` | one councillor's vote on one motion | `motion_id`, `councillor_id`, `vote` |
| `attendance.csv` | one member's attendance at one meeting (from the minutes' "Present" / "Regrets" list) | `meeting_id`, `councillor_id`, `status` (present / regrets / absent), `note` (e.g. "exited at 3:05 p.m.") |
| `expenses.csv` | one expense total for a councillor | `councillor_id`, `year`, `category`, `amount`, `source_url` |
| `salaries.csv` | one year of Town of Ajax pay for a member of council | `councillor_id`, `year`, `salary`, `taxable_benefits`, `source_url` |
| `budget.csv` | one department's operating budget for one year | `year`, `department`, `gross_expenditure`, `revenue`, `net_budget`, `source_url`, `page` |
| `capital_projects.csv` | one capital project in its budget year | `year`, `project_name`, `department`, `cost`, `funding_source`, `source_url`, `page` |
| `budget_reconciliation.csv` | why one year's department totals differ from the budget book's town-wide page (shown as a note on the Spending page) | `year`, `departments_spending`, `departments_revenue`, `town_spending`, `town_revenue`, `library_revenue`, `library_debt`, `other_costs`, `other_recoveries`, `town_page`, `library_page`, `source_url` |
| `actuals.csv` | one line of the Town's audited results for one year (revenue by source, spending by service area) | `year`, `section`, `category`, `budget`, `actual`, `source_url`, `page` |
| `documents.csv` | one budget or financial report document (shown on the Spending page's Documents tab) | `year`, `group`, `title`, `url` |
| `budget_adoption.csv` | who adopted each year's budget, and when | `year`, `adopted_by`, `date`, `source` |

`salaries.csv` is filled in automatically by a script (see
[Updating salaries](#updating-salaries-the-sunshine-list) below), so you
normally don't edit it by hand. The `review` folder inside `data` holds notes
the scripts leave for you to check. The website doesn't display them.

### How the files connect: IDs

Each record gets a short **ID** so other files can point to it. For example,
give each councillor an ID like `jane-smith` in `councillors.csv`. Then everywhere
else that councillor appears (seats, votes, expenses, mover, seconder) you use
`jane-smith` rather than typing their name again.

That way, a name only needs to be spelled correctly in one place.

A councillor's ID is also their page address on the site: `jane-smith` becomes
`/councillors/jane-smith`. So use lowercase letters, numbers and hyphens only,
and keep it the same forever so links people share keep working.

A small example:

**terms.csv**
```
id,name,start_date,end_date
2022-2026,2022–2026 Term,2022-11-15,2026-11-14
```

**councillors.csv**
```
id,name
jane-smith,Jane Smith
```

**seats.csv**
```
councillor_id,term_id,role,ward
jane-smith,2022-2026,Local Councillor,Ward 1
```

**meetings.csv**
```
id,term_id,date,type,minutes_url
m-2024-03-18,2022-2026,2024-03-18,Council,https://example.com/minutes.pdf
```

**motions.csv**
```
id,meeting_id,item,text,mover,seconder,result,recorded_vote
mo-001,m-2024-03-18,8.1,"Approve the 2024 parks plan, as amended",jane-smith,john-jones,Carried,yes
```

**votes.csv**
```
motion_id,councillor_id,vote
mo-001,jane-smith,Yes
```

**expenses.csv**
```
councillor_id,year,category,amount,source_url
jane-smith,2024,Mileage,1250.40,https://example.com/expenses-2024.pdf
```

### Tips

- **Dates:** write them as `YYYY-MM-DD` (e.g. `2024-03-18`).
- **Money:** numbers only — no `$` sign and no commas (write `1250.40`, not
  `$1,250.40`).
- **IDs:** short, no spaces, and never reuse one. Once a record has an ID,
  don't change it, or anything pointing at it will break.
- **Commas in text:** if a cell contains a comma (common in motion text), it
  needs quotation marks around it. Excel and Google Sheets do this for you
  automatically when saving as CSV.
- **Sources:** include a link to the original public document wherever there's
  a `url` column, so readers can check it themselves.
- **Roles** (in `seats.csv`): use exactly `Mayor`, `Regional Councillor` or
  `Local Councillor`, spelled the same way every time. Leave `ward` blank for
  the Mayor.
- **New council term:** add a row to `terms.csv` and the members' rows to
  `seats.csv` (and any new people to `councillors.csv`). The Councillors page
  always opens on the newest term that has members, so nothing else needs
  changing.
- **Votes:** `votes.csv` is only needed for recorded votes. Use the same words
  every time (e.g. `Yes`, `No`, `Absent`).

---

## Updating salaries (the Sunshine List)

Ontario publishes the pay of every public sector employee who earned
**$100,000 or more**. This is the "Sunshine List". The list for a year comes out
the following spring. For example, 2025 pay was published in March 2026.

A script downloads the list, picks out the Town of Ajax's Mayor and
Councillors, matches them to `councillors.csv`, and updates `salaries.csv`.
It only replaces the years you ask for, so earlier years are kept. Ask a
developer (or Claude) to run it each spring once the new year is out:

```bash
npm run salaries                # 2019–2025
npm run salaries -- 2026        # add one new year once it's published
```

Afterwards, open `data/review/salaries.md`. It lists:

- **names that didn't match**: someone on the list who isn't in
  `councillors.csv`, or whose name is spelled differently. Fix
  `councillors.csv` and run the script again.
- **partial matches** to double-check (e.g. "Rob" matched to "Robert").
- **years not published yet**.

A member of council who doesn't appear for a year was paid **under $100,000**
by the Town. It doesn't mean they were paid nothing. Regional Councillors and
the Mayor are also paid separately by the Region of Durham, and that pay isn't
included.

---

## Updating the budget

The Town's budget books (PDFs) are saved in `sources/budgets/`. A script reads
them and writes `budget.csv` and `capital_projects.csv`:

```bash
python3 scripts/extract_budget.py
```

- **`budget.csv`** has one row per department per year: what it spends
  (`gross_expenditure`), what it brings in from fees, grants and recoveries
  (`revenue`), and the difference paid for by property tax (`net_budget`).
  Mayor and Council is its own row.
- **`capital_projects.csv`** lists every capital project with money in that
  year's budget (not the 10-year forecast), with its cost and how it's paid for.
- **`page`** is the page in the PDF where the number comes from, so anyone can
  check it.
- **`budget_reconciliation.csv`** is also written by the script. It feeds the
  note behind the "i" next to "Operating budget" on the website.

The script checks its numbers against each book's own totals and writes the
results to `data/review/budget.md`. Read that file after every run.

To add a new year: save the operating and capital PDFs into
`sources/budgets/`, add their web addresses to the `OPERATING` and `CAPITAL`
lists at the top of `scripts/extract_budget.py`, and run it again. If a new
book is laid out differently, the checks in the review file will show it.

---

## Updating actual results (financial statements)

The Town's audited financial statements are saved in
`sources/financial-statements/`. Each spring/summer a new one comes out. To add it:

1. Save the PDF into `sources/financial-statements/`.
2. Add its web address to the `STATEMENTS` list at the top of
   `scripts/extract_actuals.py`.
3. Run `python3 scripts/extract_actuals.py`, then check
   `data/review/actuals.md`.
4. Add a row for it to `data/documents.csv` (group `Financial statements`).

`documents.csv` can be edited by hand any time to add presentations or other
reports. Use group `Budget` or `Financial statements`.

The Spending page has three tabs for each year: **Planned** (the budget books),
**Actual** (the audited results) and **Documents** (links to the originals).
Note that the actual results are grouped by service area, not department,
and are counted differently, so they don't match the Planned tab. The "i"
notes on the page explain this to readers.

---

## Updating meetings and minutes

`scripts/fetch_meetings.py` collects every Council, Special Council and
General Government Committee meeting for a council term from the Town's
meeting portal (https://ajax.cityconnections.civicflow.co/p/town-of-ajax),
which replaced events.ajax.ca in 2026:

```bash
pip install pypdf                          # once
python3 scripts/fetch_meetings.py          # 2022-2026 term
python3 scripts/fetch_meetings.py 2026-2030
```

It fills in `meetings.csv`, saves minutes to `sources/minutes/`, and saves
any agenda item or attachment with "Remuneration" in its title to
`sources/expenses/` (listed in `data/review/remuneration-found.md`). For
older meetings it saves just that agenda item's pages, not the whole agenda.
Check `data/review/meetings.md` afterwards for meetings with no minutes.

The portal was still being updated when this was written, so re-run the
script now and then. It only downloads what's new.

---

## Updating councillor expenses

Each spring the Town's treasurer reports every member's pay and expenses for
the year before (the "Statement of Remuneration and Expenses"). It goes to a
General Government Committee meeting, and `scripts/fetch_meetings.py` saves it
to `sources/expenses/`. Then run:

```bash
python3 scripts/extract_expenses.py
```

This rewrites `data/expenses.csv` from all the statements and checks every
column against the statement's Total row (`data/review/expenses.md`). The
numbers show up in the Expenses section of each councillor's profile.

---

## Design and photos

The look borrows the Town of Ajax's colours (navy `#1c2a56`, gold `#f0a123`,
red `#ce312b`) and typeface (Poppins), but the site deliberately does **not**
use the Town's logo or copy its website, and says on every page that it's
independent. An official-looking site would mislead readers into thinking it's
run by the Town. If the Town ever gives written permission to use its logo,
it can be added to the header in `app/layout.js`.

- **Scenic photos** are in `public/photos/` and listed with their licences in
  `data/photos.csv`. They're freely licensed (CC BY / CC BY-SA) from Wikimedia
  Commons. The aerial shots are the Town's own, from a video it published
  under CC BY. Credits are shown on each banner and on the
  About & photo credits page (`/credits`). Keep the credits if you swap photos.
- **Councillor photos** are the Town's official portraits from its Meet Your
  Mayor & Council page, listed in `data/councillor_photos.csv` and credited on
  each profile. The Town doesn't publish reuse terms, so if it asks for them
  to be removed, delete the rows (the site falls back to initials). Members
  without a photo show their initials. To add one, save the image to
  `public/councillors/<id>.jpg` and add a row to the CSV.

---

## How motions and votes are read

`scripts/extract_motions.py` reads every minutes file in `sources/minutes/`
(scanned ones via the OCR text in `sources/minutes-text/`) and writes
`motions.csv`, `votes.csv` and `attendance.csv`. Check
`data/review/votes.md` after each run; it has a coverage table by year.

- **procedural** marks routine motions: adjournment, going into closed
  session, and the confirming by-law. Ajax's minutes have no separate
  "approve the agenda" motion. The Votes page hides these by default.
- **[sic]**: where the Town's own minutes contradict the agenda item (e.g. a
  2026 report called "March 9, 2025"), the text is kept exactly as written
  and the wrong date is followed by [sic]. These are listed in the review file.
- **Absent / Didn't vote** on recorded votes come from the attendance list.
  Anyone with a recorded vote counts as present even if a typo in the list
  left them out (listed in the review file).

---

## Updating the live site

The site is hosted on Vercel and connected to this project's GitHub repository.
When you change a file in the `data` folder and save (commit) it to GitHub,
Vercel automatically rebuilds the site. The changes appear within a minute or
two. You can edit files directly on the GitHub website: open the file, click
the pencil icon, make your change, and click **Commit changes**.

---

## For developers

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

- Next.js (App Router), plain JavaScript and CSS, no other dependencies.
- `lib/data.js` reads and parses the CSV files. Pages read the data on the
  server at build time, so the deployed site is static and fast.
- Pages live in `app/`. Votes and Expenses are placeholders for now.
- `scripts/fetch-salaries.mjs` updates `data/salaries.csv` for the years given,
  keeping rows for other years. 2021 onward comes from the file index at
  `https://www.ontario.ca/public-sector-salary-disclosure_artifacts/pssdfiles.json`,
  earlier years from the data.ontario.ca CKAN catalogue
  (`public-sector-salary-disclosure-YYYY`). It applies each year's addendum
  file (additions, changes, deletions). Needs Node 18+ and network
  access to www.ontario.ca. Behind an HTTP proxy, run it with
  `NODE_USE_ENV_PROXY=1`.
- `scripts/extract_actuals.py` reads the "Consolidated statement of operations"
  page and checks lines against the statement's totals and surplus.
- `scripts/extract_budget.py` needs Python 3 and `pdftotext` (poppler-utils).
  It only reads local PDFs. `sources/` is excluded from Vercel uploads via
  `.vercelignore`.
