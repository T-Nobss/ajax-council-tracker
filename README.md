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
| `motions.csv` | a motion voted on at a meeting | `id`, `meeting_id`, `item`, `text`, `mover`, `seconder`, `result`, `recorded_vote` |
| `votes.csv` | one councillor's vote on one motion | `motion_id`, `councillor_id`, `vote` |
| `expenses.csv` | one expense total for a councillor | `councillor_id`, `year`, `category`, `amount`, `source_url` |
| `salaries.csv` | one year of Town of Ajax pay for a member of council | `councillor_id`, `year`, `salary`, `taxable_benefits`, `source_url` |
| `budget.csv` | one department's operating budget for one year | `year`, `department`, `gross_expenditure`, `revenue`, `net_budget`, `source_url`, `page` |
| `capital_projects.csv` | one capital project in its budget year | `year`, `project_name`, `department`, `cost`, `funding_source`, `source_url`, `page` |

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

The script checks its numbers against each book's own totals and writes the
results to `data/review/budget.md`. Read that file after every run.

To add a new year: save the operating and capital PDFs into
`sources/budgets/`, add their web addresses to the `OPERATING` and `CAPITAL`
lists at the top of `scripts/extract_budget.py`, and run it again. If a new
book is laid out differently, the checks in the review file will show it.

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
- Pages live in `app/`. Votes, Expenses and Budget are placeholders for now.
- `scripts/fetch-salaries.mjs` updates `data/salaries.csv` for the years given,
  keeping rows for other years. 2021 onward comes from the file index at
  `https://www.ontario.ca/public-sector-salary-disclosure_artifacts/pssdfiles.json`,
  earlier years from the data.ontario.ca CKAN catalogue
  (`public-sector-salary-disclosure-YYYY`). It applies each year's addendum
  file (additions, changes, deletions). Needs Node 18+ and network
  access to www.ontario.ca. Behind an HTTP proxy, run it with
  `NODE_USE_ENV_PROXY=1`.
- `scripts/extract_budget.py` needs Python 3 and `pdftotext` (poppler-utils).
  It only reads local PDFs. `sources/` is excluded from Vercel uploads via
  `.vercelignore`.
