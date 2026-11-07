#!/usr/bin/env python3
"""
Extract actual results from the Town of Ajax's audited financial statements
in sources/financial-statements/.

    python3 scripts/extract_actuals.py

Writes:
  data/actuals.csv          revenue by source and expenses by service area,
                            budget vs actual, one row per line per year
  data/review/actuals.md    checks against the statements' own totals

Reads the "Consolidated statement of operations" (one page per year). Each
line has three amounts: Budget, this year's actual, last year's actual. Only
the first two are used; last year is checked against the previous statement.

Needs `pdftotext` (from poppler-utils).
"""

import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sources" / "financial-statements"
DATA = ROOT / "data"
SITE = "https://ajax.ca/wp-content/uploads"

STATEMENTS = {
    2023: "2026/07/Town-of-Ajax-2023-Audited-Financial-Statements.pdf",
    2024: "2026/07/The-Corporation-of-the-Town-of-Ajax-2024-12-31-FS-Final-unsecured-AODA.pdf",
    2025: "2026/07/The-Corporation-of-the-Town-of-Ajax-12312025-Consolidated-Final-FS-For-AODA-AODA.pdf",
}

# The same line is worded differently in some years.
LABELS = {
    "Government grants": "Government transfers",
    "Other": "Other income",
    "(Loss) gain on disposal of tangible capital assets": "Gain or loss on sale of assets",
    "Loss on disposal of tangible capital assets": "Gain or loss on sale of assets",
    "Gain (Loss) on disposal of tangible capital assets": "Gain or loss on sale of assets",
}

AMOUNT = r"\(?-?[\d,]+\)?|—|-"


def to_num(tok):
    if tok in ("—", "-"):
        return 0
    neg = tok.startswith("(")
    v = int(tok.strip("()").replace(",", ""))
    return -v if neg else v


def statement(year, rel):
    pdf = SRC / Path(rel).name
    text = subprocess.run(["pdftotext", "-layout", str(pdf), "-"],
                          check=True, capture_output=True, text=True).stdout
    pages = text.split("\f")
    page_no = next(i for i, p in enumerate(pages, 1)
                   if re.search(r"^\s*Consolidated statement of operations\s*$", p, re.M)
                   and "Annual surplus" in p)
    page = pages[page_no - 1]
    note = re.search(r"\(Note (\d+)\)", page)

    rows, totals, surplus = [], {}, None
    section, label = None, ""
    for line in page.splitlines():
        s = line.strip()
        if re.match(r"^Revenue\b", s):
            section, label = "revenue", ""
            continue
        if re.match(r"^Expenses\b", s):
            section, label = "expense", ""
            continue
        if s.startswith("Annual surplus"):
            nums = re.findall(AMOUNT, s.split("Annual surplus (deficit)")[-1].split("Annual surplus")[-1])
            surplus = [to_num(x) for x in nums[-3:]]
            break
        if not section or not s:
            continue
        m = re.match(r"^(.*?)\s*((?:(?:" + AMOUNT + r")\s+){2}(?:" + AMOUNT + r"))$", s)
        if m:
            text_part, nums = m.group(1), [to_num(x) for x in m.group(2).split()]
            # A note number ("19") can sit between the label and the amounts.
            text_part = re.sub(r"\s+\d{1,2}$", "", text_part)
            full = (label + " " + text_part).strip()
            if not full:
                totals[section] = nums
            else:
                name = re.sub(r"\s+", " ", full)
                rows.append({"section": section, "category": LABELS.get(name, name),
                             "budget": nums[0], "actual": nums[1], "prior": nums[2]})
            label = ""
        else:
            label = (label + " " + re.sub(r"\s+\d{1,2}$", "", s)).strip()
    return rows, totals, surplus, page_no, note.group(1) if note else "?"


def fmt(n):
    return f"({abs(n):,})" if n < 0 else f"{n:,}"


def main():
    out_rows, checks, problems = [], [], []
    prior_actuals = {}
    for year in sorted(STATEMENTS):
        rel = STATEMENTS[year]
        rows, totals, surplus, page, note = statement(year, rel)
        url = f"{SITE}/{rel}"
        lines = [f"**{year}** (statement of operations, PDF page {page}; budget restated in Note {note})", ""]
        for sec in ("revenue", "expense"):
            items = [r for r in rows if r["section"] == sec]
            for i, col in enumerate(("budget", "actual")):
                got = sum(r[col] for r in items)
                want = totals.get(sec, [None, None])[i]
                ok = want is not None and got == want
                lines.append(f"- {'✅' if ok else '❌'} {sec.title()} {col}: {len(items)} lines add up to "
                             f"{fmt(got)}; statement total {fmt(want) if want is not None else 'not found'}.")
                if not ok:
                    problems.append(f"{year} {sec} {col}: lines add up to {fmt(got)}, statement says {want}.")
        for i, col in enumerate(("budget", "actual")):
            rev = totals["revenue"][i]
            exp = totals["expense"][i]
            ok = surplus is not None and rev - exp == surplus[i]
            lines.append(f"- {'✅' if ok else '❌'} Annual surplus ({col}): revenue − expenses = "
                         f"{fmt(rev - exp)}; statement says {fmt(surplus[i])}.")
            if not ok:
                problems.append(f"{year} surplus ({col}) doesn't match.")
        # Last year's actuals, as restated in this statement, vs last statement.
        if year - 1 in prior_actuals:
            diffs = [f"{r['category']} {fmt(prior_actuals[year - 1].get((r['section'], r['category']), 0))} → {fmt(r['prior'])}"
                     for r in rows
                     if prior_actuals[year - 1].get((r["section"], r["category"])) != r["prior"]]
            lines.append(f"- {'✅' if not diffs else 'ℹ️'} {year - 1} actuals repeated in this statement "
                         + ("match the " + str(year - 1) + " statement." if not diffs
                            else "were restated: " + "; ".join(diffs) + "."))
        prior_actuals[year] = {(r["section"], r["category"]): r["actual"] for r in rows}
        checks += lines + [""]
        for r in rows:
            out_rows.append({"year": year, "section": r["section"], "category": r["category"],
                             "budget": r["budget"], "actual": r["actual"],
                             "source_url": url, "page": page})

    with open(DATA / "actuals.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["year", "section", "category", "budget", "actual", "source_url", "page"],
                           lineterminator="\n")
        w.writeheader()
        w.writerows(out_rows)

    review = ["# Actuals: checks", "",
              "Generated by `scripts/extract_actuals.py` from the audited financial statements "
              "in `sources/financial-statements/`.", "",
              f"`data/actuals.csv`: {len(out_rows)} rows.", "", "## Checks", ""] + checks + [
              "## Problems", "", "\n".join(f"- {p}" for p in problems) or "None.", "",
              "## Good to know", "",
              "- The statements group spending by **service area** (General government, "
              "Transportation, …), not by department, so they can't be lined up with "
              "`budget.csv` row by row.",
              "- They use full accrual accounting: buildings, roads and vehicles are counted "
              "as a cost spread over their useful life (amortization), not when they're bought. "
              "The **budget** column is the Town's adopted budget restated on that same basis "
              "(see the Budget figures note in each statement), so budget vs actual is a fair "
              "comparison, but those budget numbers won't match the budget books.",
              "- The statements are consolidated: they include the Library and the Town's share "
              "of Elexicon (its electricity company).", ""]
    (DATA / "review").mkdir(exist_ok=True)
    (DATA / "review" / "actuals.md").write_text("\n".join(review))
    print("\n".join(checks))
    print("Problems:", problems or "none")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
