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

### How the files connect: IDs

Each record gets a short **ID** so other files can point to it. For example,
give each councillor an ID like `c-smith` in `councillors.csv`. Then everywhere
else that councillor appears (seats, votes, expenses, mover, seconder) you use
`c-smith` rather than typing their name again.

That way, a name only needs to be spelled correctly in one place.

A small example:

**terms.csv**
```
id,name,start_date,end_date
2022-2026,2022–2026 Term,2022-11-15,2026-11-14
```

**councillors.csv**
```
id,name
c-smith,Jane Smith
```

**seats.csv**
```
councillor_id,term_id,role,ward
c-smith,2022-2026,Regional & Local Councillor,Ward 1
```

**meetings.csv**
```
id,term_id,date,type,minutes_url
m-2024-03-18,2022-2026,2024-03-18,Council,https://example.com/minutes.pdf
```

**motions.csv**
```
id,meeting_id,item,text,mover,seconder,result,recorded_vote
mo-001,m-2024-03-18,8.1,"Approve the 2024 parks plan, as amended",c-smith,c-jones,Carried,yes
```

**votes.csv**
```
motion_id,councillor_id,vote
mo-001,c-smith,Yes
```

**expenses.csv**
```
councillor_id,year,category,amount,source_url
c-smith,2024,Mileage,1250.40,https://example.com/expenses-2024.pdf
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
- **Votes:** `votes.csv` is only needed for recorded votes. Use the same words
  every time (e.g. `Yes`, `No`, `Absent`).

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
- Pages live in `app/`. Councillors, Votes, Expenses and Budget are
  placeholders for now.
