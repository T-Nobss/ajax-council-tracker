#!/usr/bin/env python3
"""
Build data/expenses.csv from the Town's annual "Statement of Remuneration and
Expenses for Members of Council" reports in sources/expenses/ (saved there by
scripts/fetch_meetings.py).

    python3 scripts/extract_expenses.py

Each statement's Table A has one row per member of Council and a column for
each kind of payment (remuneration/benefits, travel allowance, meeting
expenses, training, ...). Columns change from year to year and many cells are
blank, so each amount is placed in the column whose Total-row figure it lines
up with. Column totals are then checked against the Total row.

Members of Council who also appear in the other tables (for example the Mayor
on the Elexicon board, or a councillor on the Library Board) are added too.

Writes data/expenses.csv (councillor_id, year, category, amount, source_url)
and data/review/expenses.md. Needs pdftotext (poppler-utils).
"""

import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sources" / "expenses"
DATA = ROOT / "data"

AMOUNT = re.compile(r"\$?\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?|(?<!\w)-(?!\w)")
PORTAL_ITEM = re.compile(r"")


def to_num(tok):
    tok = tok.replace("$", "").replace(",", "")
    if tok == "-":
        return 0.0
    neg = tok.startswith("(")
    v = float(tok.strip("()"))
    return -v if neg else v


def norm(s):
    return re.sub(r"[^a-z]+", " ", s.lower()).strip()


def load_councillors():
    with open(DATA / "councillors.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def match_name(name, councillors):
    """'S. Collier', 'R. Morin', 'Sterling Lee' -> councillor id (or None)."""
    n = norm(name).split()
    if not n:
        return None
    first, last = n[0], n[-1]
    hits = []
    for c in councillors:
        parts = norm(c["name"]).split()
        if last in parts[1:] and parts[0].startswith(first[0]):
            if len(first) == 1 or parts[0] == first:
                hits.append(c["id"])
    return hits[0] if len(hits) == 1 else None


def source_link(path):
    """Where the statement came from, from data/review/remuneration-found.md."""
    review = DATA / "review" / "remuneration-found.md"
    if review.exists():
        rel = str(path.relative_to(ROOT))
        for line in review.read_text().splitlines():
            if rel in line:
                m = re.search(r"\]\((https?://[^)]+)\)", line)
                if m:
                    return m.group(1)
    return ""


def table_a(lines):
    """Rows of Table A: (name, {column: amount}), plus the Total row and columns."""
    start = next(i for i, l in enumerate(lines) if re.search(r"Table A\b", l))
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"\s*Table [B-Z]\b", lines[i])), len(lines))
    block = lines[start + 1:end]
    total_i = next(i for i, l in enumerate(block) if re.match(r"\s*Total\b", l))
    total_line = block[total_i]
    spans = [(m.start(), m.end()) for m in AMOUNT.finditer(total_line)]
    centers = [(a + b) / 2 for a, b in spans]

    def col_of(pos_a, pos_b):
        c = (pos_a + pos_b) / 2
        return min(range(len(centers)), key=lambda k: abs(centers[k] - c))

    # Column names: header words above the first member row, by position.
    first_row = next(i for i, l in enumerate(block) if re.match(r"\s*[A-Z]\.\s*[A-Z]", l))
    names = [[] for _ in spans]
    for l in block[:first_row]:
        if "Member" in l:
            l = l.replace("Member’s Name", " " * 13).replace("Member's Name", " " * 13)
        for m in re.finditer(r"\S+(?: \S+)*", l):
            if AMOUNT.fullmatch(m.group()) or m.start() < spans[0][0] - 12:
                continue
            names[col_of(m.start(), m.end())].append(m.group())
    columns = [re.sub(r"\s*/\s*", "/", " ".join(w)).strip() or f"Column {k + 1}" for k, w in enumerate(names)]
    # A heading's last words can be printed on a member's row, e.g.
    # "(net of $6,000" above and "grant)" beside the amount.
    for k, c in enumerate(columns):
        if c.count("(") > c.count(")"):
            tail = re.search(r"\b([a-z]+\))", " ".join(block[first_row:total_i]))
            columns[k] = c + (" " + tail.group(1) if tail else ")")

    def amounts(line):
        # Ignore text like "(net of $6,000 grant)".
        clean = re.sub(r"net of \$?[\d,]+(?:\.\d{2})?", lambda m: " " * len(m.group()), line)
        return {col_of(m.start(), m.end()): to_num(m.group()) for m in AMOUNT.finditer(clean)
                if m.start() >= spans[0][0] - 12}

    rows, notes, pending = [], [], {}
    for i, l in enumerate(block):
        if i == total_i:
            continue
        m = re.match(r"\s*([A-Z]\.\s*[A-Za-z’'\-]+(?:\s[A-Za-z’'\-]+)?)\s*(\*)?\s", l)
        if m:
            vals = amounts(l)
            for k, v in pending.items():  # an amount printed on the line above
                vals.setdefault(k, v)
            pending = {}
            rows.append((m.group(1).strip(), vals, bool(m.group(2))))
        elif AMOUNT.search(l) and not re.search(r"[A-Za-z]{4,}", re.sub(r"net of|grant", "", l)):
            pending = amounts(l)
        elif l.strip() and not AMOUNT.search(l) and i > first_row:
            notes.append(l.strip())
    totals = amounts(total_line)
    return columns, rows, totals, notes


def other_tables(lines, councillors):
    """Amounts paid to members of Council in tables other than Table A."""
    out = []
    title = None
    header_cols = []
    for l in lines:
        t = re.match(r"\s*Table ([B-Z])\s*-\s*(.+)", l)
        if t:
            title = re.sub(r"^Ajax Council Appointees\s*-\s*", "", t.group(2)).strip()
            header_cols = []
            continue
        if not title:
            continue
        if "Member" in l and "Name" in l:
            header_cols = [h for h in re.split(r"\s{2,}", l.strip()) if h and "Member" not in h]
            continue
        for c in councillors:
            for variant in {c["name"], c["name"].replace("-", " ")}:
                idx = l.find(variant)
                if idx < 0:
                    continue
                # Amounts after the name, up to the next name on the same
                # line (some tables have two columns of members).
                rest = l[idx + len(variant):]
                nxt = re.search(r"[A-Za-z]{2}", rest)
                rest = rest[:nxt.start()] if nxt else rest
                vals = [to_num(x.group()) for x in AMOUNT.finditer(rest)]
                if "Elexicon" in title and len(vals) >= 2:
                    parts = [("Remuneration", vals[0]), ("Training/Meetings", vals[1])]
                else:
                    # The column heading can wrap around "Member's Name";
                    # Library Board amounts are training and meetings.
                    col = header_cols[0] if header_cols else (
                        "Training/Meetings" if "Library" in title else "Honorariums")
                    parts = [(col, vals[0])] if vals else []
                for col, v in parts:
                    out.append((c["id"], f"{title}: {col}", v))
    return out


def main():
    councillors = load_councillors()
    files = sorted(p for p in SRC.glob("*Statement_of_Remuneration_and_Expenses*.pdf"))
    rows_out, review, problems = [], [], []

    by_year = {}
    for path in files:
        text = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True).stdout
        if "Table A" not in text:
            continue
        m = re.search(r"(\d{4}) Statement of Remuneration", text) or re.search(r"(\d{4})_Statement", path.name)
        year = int(m.group(1))
        by_year.setdefault(year, (path, text))  # one statement per year

    # Only years fully inside the council terms in terms.csv: a year when the
    # previous council sat for most of it (e.g. 2018) would have members who
    # aren't in councillors.csv.
    with open(DATA / "terms.csv", newline="", encoding="utf-8") as f:
        starts = [t["start_date"] for t in csv.DictReader(f)]
    first = min(starts) if starts else "0000-01-01"
    first_full_year = int(first[:4]) + (0 if first[5:] == "01-01" else 1)
    skipped = [y for y in by_year if y < first_full_year]
    for y in skipped:
        review.append(f"Skipped the {y} statement: {y} is before {first_full_year}, the first full "
                      f"year of the earliest council term in terms.csv.")
        review.append("")
        del by_year[y]

    for year, (path, text) in sorted(by_year.items()):
        url = source_link(path) or str(path.relative_to(ROOT))
        lines = text.splitlines()
        columns, rows, totals, notes = table_a(lines)
        total_col = next((k for k, c in enumerate(columns) if c.lower() == "total"), None)
        review.append(f"**{year}** — `{path.name}`")
        review.append("")
        review.append(f"Columns found: {', '.join(c for k, c in enumerate(columns) if k != total_col)}")
        review.append("")

        # Column totals vs the Total row (only rows above it are in that total).
        sums = {}
        main_rows = []
        seen_total = False
        tl = [l for l in lines]
        for name, vals, star in rows:
            main_rows.append((name, vals, star))
        # Rows below the Total line (incoming/outgoing members) aren't in it.
        after = set()
        a_start = next(i for i, l in enumerate(lines) if re.search(r"Table A\b", l))
        t_line = next(i for i in range(a_start, len(lines)) if re.match(r"\s*Total\b", lines[i]))
        for i in range(t_line + 1, len(lines)):
            if re.match(r"\s*Table [B-Z]\b", lines[i]):
                break
            mm = re.match(r"\s*([A-Z]\.\s*[A-Za-z’'\-]+)", lines[i])
            if mm:
                after.add(mm.group(1).strip())
        for name, vals, _ in main_rows:
            if name in after:
                continue
            for k, v in vals.items():
                sums[k] = sums.get(k, 0) + v
        for k, tot in totals.items():
            ok = abs(sums.get(k, 0) - tot) < 0.015
            review.append(f"- {'✅' if ok else '❌'} {columns[k]}: members add up to {sums.get(k, 0):,.2f}; "
                          f"Total row says {tot:,.2f}")
            if not ok:
                problems.append(f"{year} {columns[k]}: rows add up to {sums.get(k, 0):,.2f}, Total row {tot:,.2f}")

        for name, vals, star in main_rows:
            cid = match_name(name, councillors)
            if not cid:
                problems.append(f"{year}: couldn't match '{name}' to councillors.csv")
                continue
            if total_col is not None and total_col in vals:
                row_sum = sum(v for k, v in vals.items() if k != total_col)
                if abs(row_sum - vals[total_col]) > 0.015:
                    problems.append(f"{year} {name}: categories add up to {row_sum:,.2f}, row total {vals[total_col]:,.2f}")
            for k, v in sorted(vals.items()):
                if k == total_col or not v:
                    continue
                cat = columns[k]
                if star and k == 0:  # the statement's footnote is about pay
                    cat += " (includes severance payment)"
                rows_out.append({"councillor_id": cid, "year": year, "category": cat,
                                 "amount": f"{v:.2f}", "source_url": url})
        for cid, cat, v in other_tables(lines, councillors):
            if v:
                rows_out.append({"councillor_id": cid, "year": year, "category": cat,
                                 "amount": f"{v:.2f}", "source_url": url})
                review.append(f"- Other table: {cid} — {cat} {v:,.2f}")
        if notes:
            review.append("")
            review.append("Notes printed in the table: " + "; ".join(notes))
        review.append("")

    # Statements whose tables are images (e.g. 2018) are transcribed by hand
    # into data/expenses_manual.csv, checked against their printed totals.
    manual = DATA / "expenses_manual.csv"
    if manual.exists():
        have = {r["year"] for r in rows_out}
        with open(manual, newline="", encoding="utf-8") as f:
            extra = [r for r in csv.DictReader(f) if int(r["year"]) not in have and str(r["year"]) not in have]
        rows_out += extra
        if extra:
            review.append(f"**{', '.join(sorted({r['year'] for r in extra}))}**: from `data/expenses_manual.csv` "
                          f"({len(extra)} rows), transcribed by hand from the statement's table images; every "
                          f"row and column was checked against the printed totals.")
            review.append("")

    with open(DATA / "expenses.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["councillor_id", "year", "category", "amount", "source_url"],
                           lineterminator="\n")
        w.writeheader()
        w.writerows(rows_out)

    out = ["# Expenses: checks", "",
           "Generated by `scripts/extract_expenses.py` from the annual Statements of "
           "Remuneration and Expenses for Members of Council in `sources/expenses/`.", "",
           f"Years: {', '.join(map(str, sorted(by_year)))}. `data/expenses.csv`: {len(rows_out)} rows.", "",
           *review,
           "## Problems", "", *([f"- {p}" for p in problems] or ["None."]), ""]
    (DATA / "review" / "expenses.md").write_text("\n".join(out))
    print("\n".join(out))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
