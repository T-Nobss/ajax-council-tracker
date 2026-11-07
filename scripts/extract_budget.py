#!/usr/bin/env python3
"""
Extract Town of Ajax budget figures from the PDFs in sources/budgets/.

    python3 scripts/extract_budget.py

Writes:
  data/budget.csv            operating budget, one row per department per year
  data/capital_projects.csv  capital projects for each budget year
  data/review/budget.md      totals checks, mismatches and unclear values

Needs `pdftotext` (from poppler-utils) on the PATH.

How the operating budget is read
--------------------------------
Each operating budget book has a "BUDGET BY DRIVER" page per department or
division, ending in three lines:
    Total Operating Expenditures   <prior year>  <budget year> ...
    Total Revenues / Recoveries    <prior year>  <budget year> ...
    NET EXPENDITURES               <prior year>  <budget year> ...
The second number on each line is the budget year. Divisions (e.g.
"Fleet / Equipment Maintenance") are added up into their department.
The book's "All Departments" summary page gives each department's net
budget and the total, which are used as the checks.
"""

import re
import subprocess
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sources" / "budgets"
DATA = ROOT / "data"
SITE = "https://ajax.ca/wp-content/uploads"

# Where each PDF was published (the source_url column).
OPERATING = {
    2026: "2026/05/2026-Operating-Budget-Booklet-Amended.pdf",
    2025: "2026/06/2025-Operating_Budget_-BookletAmended_.pdf",
    2024: "2026/06/2024-Operating-Budget-Amended.pdf",
    2023: "2026/06/2023-Operating-Budget-Electronic-Version.pdf",
}
CAPITAL = {
    2026: "2026/05/2026-Capital-Budget-and-2027-to-2035-LRCF-Amended-1.pdf",
    2025: "2026/06/2025-Capital-Budget-and-2026-to-2034-LRCF-Amended.pdf",
    2024: "2026/06/2024-Capital-Budget-and-2025-2033-Long-Range-Capital-Forecast-Amended.pdf",
    2023: "2026/06/2023-CAPITAL-BUDGET-and-2024-to-2032-Long-Range-Capital-Forecast-Council-Amended-1.pdf",
}

# Division pages -> the department they belong to. Department names are
# written the way the books' summary tables write them.
DIVISION_TO_DEPT = {
    "Mayor/Council Office": "Mayor & Council",
    "Operations Administration": "Operations & Environmental Services",
    "Operations": "Operations & Environmental Services",
    "Environmental Services": "Operations & Environmental Services",
    "Fleet / Equipment Maintenance": "Operations & Environmental Services",
    "Building Maintenance": "Operations & Environmental Services",
    "Infrastructure": "Operations & Environmental Services",
    "Recreation Administration": "Recreation & Culture",
    "Recreation Facilities": "Recreation & Culture",
    "Recreation Programs / Active Living": "Recreation & Culture",
    "Community & Cultural Development": "Recreation & Culture",
    "Culture & Events": "Recreation & Culture",
    "LIBRARY SERVICES": "Library Services",
}
# Summary tables call the library different things in different years.
DEPT_ALIASES = {"Ajax Public Library": "Library Services"}

# ---------------------------------------------------------------- helpers

NUM = r"\(?-?[\d,]+(?:\.\d+)?\)?|-"


def pages(pdf):
    """Text of each page, keeping the table layout. Index 0 = page 1."""
    out = subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"],
        check=True, capture_output=True, text=True,
    ).stdout
    # Some books print zero as a Unicode hyphen or dash; make them plain "-".
    out = re.sub("[\u2010\u2011\u2012\u2013\u2014\u2212]", "-", out)
    return out.split("\f")


def to_num(tok):
    tok = tok.strip()
    if tok in ("-", ""):
        return 0
    neg = tok.startswith("(") and tok.endswith(")")
    val = float(tok.strip("()").replace(",", ""))
    return -val if neg else val


def numbers_after(line, label):
    """Numbers that follow `label` on a line."""
    rest = line.split(label, 1)[1]
    return [to_num(t) for t in re.findall(NUM, rest)]


def fmt(n):
    n = round(n)
    return f"({abs(n):,})" if n < 0 else f"{n:,}"


def money(n):
    return str(int(round(n)))


def find_line(text, label):
    for line in text.splitlines():
        if re.match(r"\s*" + re.escape(label) + r"\b", line):
            return line
    return None


# --------------------------------------------------------------- operating


def page_title(text):
    """The department/division name printed under 'BUDGET BY DRIVER'."""
    lines = [l.strip() for l in text.splitlines()[:10] if l.strip()]
    for i, l in enumerate(lines):
        if "BUDGET BY DRIVER" in l:
            for nxt in lines[i + 1:i + 3]:
                name = re.split(r"\s{2,}", nxt)[0].strip()
                if name.lower() == "amended":
                    continue
                # A column-header row ("2023  2024 ...") means no title.
                if re.match(r"\d{4}\b", name):
                    return None
                return name
    return None


def line_items(text):
    """{("E"|"R", label): budget-year amount} for one budget-by-driver page."""
    items = Counter()
    section = None
    for line in text.splitlines():
        if "OPERATING EXPENDITURES" in line:
            section = "E"
        elif "OPERATING REVENUES" in line:
            section = "R"
        m = re.match(r"\s+([A-Z][A-Za-z0-9$&/,() .'-]+?)\s{2,}(" + NUM + r")\s", line)
        if m and section and not m.group(1).startswith(("Total", "NET")):
            label = m.group(1).strip().replace("Slots", "Casino Ajax")  # renamed in 2024
            items[(section, label)] += numbers_after(line, m.group(1))[1]
    return items


def reconcile(year, gap_e, gap_r, town, dept, lib_items, lib, tp):
    """
    Explain why departments add up to more than the town-wide page.
    The town-wide page (1) counts the Library as one grant of its net cost,
    so the Library's revenue drops out of both sides; (2) also lists the
    Library's debt payment and the reserve money that pays it on their own;
    (3) has some costs, matched by recoveries, that aren't on any department
    page. Returns the breakdown if it accounts for the gap (within $100 of
    rounding), else None.
    """
    if not lib:
        return None
    lib_page, _, lib_rev = lib
    repeated = {}
    for k in (("E", "Debenture"), ("R", "Reserve Allocations")):
        if lib_items.get(k) and abs((town[k] - dept[k]) - lib_items[k]) < 0.5:
            repeated[k] = lib_items[k]
    other = {}
    for k in set(town) | set(dept):
        if k in repeated or k[1] in ("Taxation Revenue", "Municipal Grants & Subsidies"):
            continue
        d = town[k] - dept[k]
        if abs(d) > 0.5:
            other[k] = d
    rep_e = sum(v for k, v in repeated.items() if k[0] == "E")
    rep_r = sum(v for k, v in repeated.items() if k[0] == "R")
    oth_e = sum(v for k, v in other.items() if k[0] == "E")
    oth_r = sum(v for k, v in other.items() if k[0] == "R")
    exp_e = lib_rev - rep_e - oth_e
    exp_r = lib_rev - rep_r - oth_r
    if abs(exp_e - gap_e) > 100.5 or abs(exp_r - gap_r) > 100.5:
        print(f"  [{year}] reconcile failed: explained {exp_e:,.0f}/{exp_r:,.0f} vs gap {gap_e:,.0f}/{gap_r:,.0f}; other={other}", file=sys.stderr)
        return None
    return {
        "lib_page": lib_page, "town_page": tp, "lib_rev": lib_rev,
        "repeated": rep_e, "other_e": oth_e, "other_r": oth_r,
        "other_lines": sorted(((k[1], v) for k, v in other.items() if k[0] == "E"), key=lambda x: -x[1]),
        "gap_e": gap_e, "gap_r": gap_r,
    }


def operating(year, rel, review):
    pdf = SRC / Path(rel).name
    url = f"{SITE}/{rel}"
    text = pages(pdf)

    depts = OrderedDict()  # dept -> dict(gross, revenue, net, pages, parts)
    summary = None  # (page_no, {dept: net}, total)
    townwide = None  # (page_no, gross, revenue)
    town_items, dept_items, lib_items = Counter(), Counter(), Counter()
    lib = None  # (page, gross, revenue)

    for i, t in enumerate(text, start=1):
        if "BUDGET BY DRIVER" not in t:
            continue
        title = page_title(t)

        # The "All Departments" summary: department net budgets + total.
        if title == "All Departments" and re.search(
            r"^\s*(Mayor & Council)", t, re.M
        ):
            nets = OrderedDict()
            total = None
            for line in t.splitlines():
                m = re.match(r"\s*([A-Za-z&/ ,.'-]+?)\s{2,}(" + NUM + r")\s", line)
                if not m:
                    continue
                name = m.group(1).strip()
                if not re.search(r"[A-Za-z]", name):
                    continue
                if name.startswith(("TOTAL DEPARTMENTAL", "Total before")):
                    total = numbers_after(line, name)[1]
                    break
                if name.isupper() or name.startswith(("General", "Ass", "PIL")):
                    continue
                nets[DEPT_ALIASES.get(name, name)] = numbers_after(line, name)[1]
            summary = (i, nets, total)
            continue

        # Town-wide totals page. 2024+ include property tax in revenue;
        # 2023's leaves it out (so its "net" is the tax levy).
        if title == "Town of Ajax" or (title is None and find_line(t, "Taxation Revenue")):
            g = find_line(t, "Total Operating Expenditures")
            r = find_line(t, "Total Revenues / Recoveries")
            tax = find_line(t, "Taxation Revenue")
            town_items.update(line_items(t))
            if g and r:
                townwide = (
                    i,
                    numbers_after(g, "Total Operating Expenditures")[1],
                    numbers_after(r, "Total Revenues / Recoveries")[1],
                    numbers_after(tax, "Taxation Revenue")[1] if tax else 0,
                )
            continue

        if not title or title in ("All Departments", "AMENDED"):
            # Some amended pages put the name one line lower.
            m = re.search(r"BUDGET BY DRIVER\s*\n\s*(?:AMENDED\s*\n\s*)?([^\n]+?)\s{2,}", t)
            title = m.group(1).strip() if m else title
        if not title or title in ("All Departments", "AMENDED"):
            review["unclear"].append(f"{year}: page {i} has a budget table with no department name; skipped.")
            continue

        g = find_line(t, "Total Operating Expenditures")
        r = find_line(t, "Total Revenues / Recoveries")
        n = find_line(t, "NET EXPENDITURES")
        if not (g and n):
            review["unclear"].append(f"{year}: page {i} ({title}) is missing its total lines; skipped.")
            continue
        gross = numbers_after(g, "Total Operating Expenditures")[1]
        rev = numbers_after(r, "Total Revenues / Recoveries")[1] if r else 0
        net = numbers_after(n, "NET EXPENDITURES")[1]
        if abs(gross - rev - net) > 1:
            review["mismatch"].append(
                f"{year} {title} (page {i}): expenditures {fmt(gross)} − revenue {fmt(rev)} "
                f"= {fmt(gross - rev)}, but the page says net {fmt(net)}."
            )

        if title == "LIBRARY SERVICES":
            lib_items.update(line_items(t))
            lib = (i, gross, rev)
        else:
            dept_items.update(line_items(t))

        dept = DEPT_ALIASES.get(DIVISION_TO_DEPT.get(title, title), DIVISION_TO_DEPT.get(title, title))
        d = depts.setdefault(dept, {"gross": 0, "revenue": 0, "net": 0, "pages": [], "parts": []})
        d["gross"] += gross
        d["revenue"] += rev
        d["net"] += net
        d["pages"].append(i)
        d["parts"].append(title)

    rows = []
    checks = []
    if not summary:
        review["unclear"].append(f"{year}: couldn't find the All Departments summary page.")
        nets, total, spage = {}, None, None
    else:
        spage, nets, total = summary

    # Department-by-department check against the summary page.
    for dept, d in depts.items():
        s = nets.get(dept)
        if s is None:
            review["unclear"].append(
                f"{year} {dept} (pages {', '.join(map(str, d['pages']))}) isn't in the "
                f"summary table on page {spage}."
            )
        elif abs(s - d["net"]) > 0.5:
            review["mismatch"].append(
                f"{year} {dept}: department pages add up to a net of {fmt(d['net'])} "
                f"(pages {', '.join(map(str, d['pages']))}), but the summary on page {spage} "
                f"says {fmt(s)} (difference {fmt(d['net'] - s)}). budget.csv uses the summary figure "
                f"for net_budget."
            )
    for dept in nets:
        if dept not in depts:
            review["unclear"].append(
                f"{year} {dept}: in the summary on page {spage} but no department page was found."
            )

    for dept, d in depts.items():
        net = nets.get(dept, d["net"])
        rows.append({
            "year": year,
            "department": dept,
            "gross_expenditure": money(d["gross"]),
            "revenue": money(d["revenue"]),
            "net_budget": money(net),
            "source_url": url,
            "page": "-".join(sorted({str(min(d["pages"])), str(max(d["pages"]))}, key=int)),
        })

    # Totals checks.
    sum_net = sum(float(r["net_budget"]) for r in rows)
    sum_gross = sum(d["gross"] for d in depts.values())
    sum_rev = sum(d["revenue"] for d in depts.values())
    if total is not None:
        ok = abs(sum_net - total) < 0.5
        checks.append(
            f"{'✅' if ok else '❌'} Net: departments add up to {fmt(sum_net)}; "
            f"the book's total (page {spage}) is {fmt(total)}."
        )
        if not ok:
            review["mismatch"].append(f"{year}: department net budgets add up to {fmt(sum_net)}, book total is {fmt(total)}.")
    if townwide:
        tp, tg, tr, ttax = townwide
        gap_e = sum_gross - tg
        gap_r = sum_rev - (tr - ttax)
        rec = reconcile(year, gap_e, gap_r, town_items, dept_items, lib_items, lib, tp)
        for label, gap, ours, theirs in (
            ("Gross expenditures", gap_e, sum_gross, f"the book's total (page {tp}) is {fmt(tg)}"),
            ("Revenue (not counting property tax)", gap_r, sum_rev,
             f"the book's total revenue {fmt(tr)} minus taxation {fmt(ttax)} is {fmt(tr - ttax)} (page {tp})"),
        ):
            if abs(gap) < 0.5:
                checks.append(f"✅ {label}: departments add up to {fmt(ours)}; {theirs}.")
            elif rec:
                checks.append(
                    f"☑️ {label}: departments add up to {fmt(ours)}; {theirs}. "
                    f"The {fmt(gap)} difference is fully explained (see below)."
                )
            else:
                checks.append(f"❌ {label}: departments add up to {fmt(ours)}; {theirs}.")
                review["mismatch"].append(
                    f"{year}: {label.lower()} from departments differ from the town-wide page by "
                    f"{fmt(gap)} (page {tp}), and the usual explanation doesn't account for it."
                )
        if rec:
            review["reconcile"][year] = rec
    else:
        review["unclear"].append(f"{year}: couldn't find the town-wide totals page to check gross and revenue.")

    has_council = any(r["department"] == "Mayor & Council" for r in rows)
    if not has_council:
        review["unclear"].append(f"{year}: no Mayor & Council line found.")

    return rows, checks


# ----------------------------------------------------------------- capital
#
# Capital books have "PROJECT LIST" pages: one line per project with an
# 8-digit project number, the name, sometimes a funding tag (DC, LC, CBC…),
# then five amounts: budget year, next year, the year after, the rest of the
# 10-year forecast, total. Only projects with a budget-year amount are kept.
# Each project's "DETAIL SHEET" gives its department and funding sources.

PROJ_LINE = re.compile(r"^\s*(\d{7,8})\s+(.*?)\s{2,}((?:(?:" + NUM + r"|--)\s+){4}(?:" + NUM + r"|--))\s*$")
FUND_TAGS = {"DC", "LC", "CBC", "DC/LC", "LC/DC", "GT", "CCBF", "OTH", "*"}
# What the funding tags on the project lists stand for (from each book's
# introduction).
TAG_NAMES = {
    "DC": "Development Charges",
    "LC": "Life Cycle (asset replacement)",
    "CBC": "Community Benefits Charges",
}


# 2023 only: projects that sit inside program sheets have no department
# printed. The book's Table 1 (pages 6-7) names the lead department for each
# program type, which is the middle of the project number (e.g. 23[0300]05).
# Program types that list more than one department are left out on purpose.
OES = "Operations & Environmental Services"
PROGRAM_DEPT = {
    2023: {
        **{code: OES for code in (
            "0101", "0104", "0200", "0230", "0300", "0301", "0302", "0304",
            "0306", "0307", "0310", "0330", "0340", "0410", "0700", "0701",
            "0703", "0704", "0705", "0706", "0707", "0709", "0710", "0720",
            "0750", "0800",
        )},
        "0103": "Legislative & Information Services",
    },
}


def clean_dept(name):
    """Write department names the way the operating budget does."""
    name = re.sub(r"\s+and\s+", " & ", name.strip())
    return DEPT_ALIASES.get(name, name)


def split_name(rest):
    """'Name   * DC' -> ('Name', 'DC')."""
    parts = re.split(r"\s{2,}", rest.strip())
    tags = []
    while parts and all(w in FUND_TAGS for w in parts[-1].split()):
        tags = parts.pop().split() + tags
    name = " ".join(parts).strip()
    # A lone tag stuck to the end of the name with one space.
    m = re.match(r"(.*?)\s+((?:\*\s*)?(?:DC|LC|CBC))$", name)
    if m:
        name, tags = m.group(1), m.group(2).split() + tags
    return name, [t for t in tags if t != "*"]


def detail_sheets(text):
    """
    Returns (sheets, parents):
      sheets:  project number -> {department, funding: [(source, amount)], page, budget}
      parents: child project number -> (page, program name) for projects that
               only appear inside a program ("parent") sheet.
    """
    out = {}
    parents = {}
    for i, t in enumerate(text, start=1):
        if "DETAIL SHEET" not in t:
            continue
        # Program sheets list child projects as "<number> <name>  amounts".
        pn = re.search(r"Project Name\s+(.+?)(?:\s{2,}|$)", t, re.M)
        for line in t.splitlines():
            cm = re.match(r"\s*(\d{7,8})\s+\S", line)
            if cm and re.search(r"\d,\d{3}|\s-\s", line):
                parents.setdefault(cm.group(1), (i, pn.group(1).strip() if pn else ""))
        m = re.search(r"^\s*Project(?: Number)?\s+(\d{7,8})\b", t, re.M)
        if not m:
            continue
        pid = m.group(1)
        dm = re.search(r"Department\s+(.+?)\s*$", t, re.M)
        dept = re.split(r"\s{2,}", dm.group(1).strip())[0] if dm else ""
        funding = []
        exp = None
        in_fund = False
        col = 0  # which amount is the budget year
        for line in t.splitlines():
            if "Previously Approved" in line:
                col = 1
            if re.match(r"\s*Total Expenditures\b", line):
                exp = numbers_after(line, "Total Expenditures")
                in_fund = True
                continue
            if re.match(r"\s*Total Funding\b", line):
                break
            if in_fund:
                mm = re.match(r"\s*([A-Za-z].*?)\s{2,}(" + NUM + r")\s", line)
                if mm:
                    nums = numbers_after(line, mm.group(1))
                    if len(nums) > col and nums[col]:
                        funding.append((mm.group(1).strip(), nums[col]))
        if pid not in out:
            out[pid] = {"department": dept, "funding": funding, "page": i,
                        "budget": exp[col] if exp and len(exp) > col else None}
    return out, parents


def capital(year, rel, review):
    pdf = SRC / Path(rel).name
    url = f"{SITE}/{rel}"
    text = pages(pdf)
    details, parents = detail_sheets(text)
    in_program = []

    rows = []
    category_totals = OrderedDict()
    grand = None
    seen = set()
    category = None
    for i, t in enumerate(text, start=1):
        if "PROJECT LIST" not in t:
            continue
        for line in t.splitlines():
            # Category headings ("ROAD NETWORK") sit on their own line.
            hm = re.match(r"^\s{0,4}([A-Z][A-Z&/ ]{4,}[A-Z])\s*$", line)
            if hm and hm.group(1) not in ("TOWN OF AJAX", "PROJECT LIST"):
                category = hm.group(1).strip()
            pm = PROJ_LINE.match(line)
            if pm:
                pid, rest, nums = pm.groups()
                amounts = [to_num(x) if x != "--" else 0 for x in nums.split()]
                budget = amounts[0]
                if not budget:
                    d0 = details.get(pid)
                    if d0 and d0["budget"]:
                        n0, _ = split_name(rest)
                        review["unclear"].append(
                            f"Capital {year} {pid} {n0}: the project list (page {i}) shows nothing for {year}, "
                            f"but its detail sheet (page {d0['page']}) shows {fmt(d0['budget'])}. Left out, "
                            f"which matches the book's grand total."
                        )
                    continue
                if pid in seen:
                    review["unclear"].append(f"Capital {year}: project {pid} appears more than once in the lists (page {i}); counted once.")
                    continue
                seen.add(pid)
                name, tags = split_name(rest)
                d = details.get(pid)
                page = str(d["page"]) if d else str(i)
                if d is None and pid in parents:
                    ppage, pname = parents[pid]
                    page = str(ppage)
                    in_program.append(f"{pid} {name} → {pname} (page {ppage})")
                elif d is None:
                    review["unclear"].append(
                        f"Capital {year} {pid} {name}: no detail sheet found (listed on page {i}); "
                        f"department left blank, funding taken from the list's tag if any."
                    )
                elif d["budget"] is not None and abs(d["budget"] - budget) > 0.5:
                    review["mismatch"].append(
                        f"Capital {year} {pid} {name}: project list (page {i}) says {fmt(budget)}, "
                        f"detail sheet (page {d['page']}) says {fmt(d['budget'])}. capital_projects.csv uses the list."
                    )
                funding = "; ".join(f"{src} {fmt(a)}" for src, a in (d["funding"] if d else []))
                if not funding and tags:
                    funding = ", ".join(TAG_NAMES.get(t, t) for t in tags)
                if d and d["funding"] and abs(sum(a for _, a in d["funding"]) - budget) > 0.5:
                    review["unclear"].append(
                        f"Capital {year} {pid} {name}: funding on the detail sheet (page {d['page']}) "
                        f"adds up to {fmt(sum(a for _, a in d['funding']))}, not {fmt(budget)}."
                    )
                dept = clean_dept(d["department"]) if d else ""
                if not dept and len(pid) == 8 and pid[2:6] in PROGRAM_DEPT.get(year, {}):
                    dept = PROGRAM_DEPT[year][pid[2:6]]
                    review["inferred"].setdefault(year, []).append(f"{pid} {name} → {dept}")
                elif not dept:
                    review["no_dept"].setdefault(year, []).append(f"{pid} {name} (page {page})")
                rows.append({
                    "year": year,
                    "project_name": f"{name} ({pid})",
                    "department": dept,
                    "cost": money(budget),
                    "funding_source": funding,
                    "source_url": url,
                    "page": page,
                    "_category": category,
                    "_list_page": i,
                })
                continue
            tm = re.match(r"\s*TOTAL ([A-Z&/ ,'-]+?)(?: \(Amended\))?\s{2,}(" + NUM + r"|--)", line)
            if tm:
                category_totals[tm.group(1).strip()] = (to_num(tm.group(2)) if tm.group(2) != "--" else 0, i)
            gm = re.match(r"\s*GRAND TOTAL\s*(?:\(Amended\))?\s+(" + NUM + r"|--)", line)
            if gm and grand is None:
                grand = (to_num(gm.group(1)) if gm.group(1) != "--" else 0, i)

    if in_program:
        review["programs"][year] = in_program

    checks = []
    total = sum(float(r["cost"]) for r in rows)
    if grand:
        ok = abs(total - grand[0]) < 0.5
        checks.append(
            f"{'✅' if ok else '❌'} {len(rows)} projects add up to {fmt(total)}; "
            f"the book's {year} capital total (page {grand[1]}) is {fmt(grand[0])}."
        )
        if not ok:
            review["mismatch"].append(f"Capital {year}: projects add up to {fmt(total)}, book total is {fmt(grand[0])} (page {grand[1]}).")
    else:
        review["unclear"].append(f"Capital {year}: couldn't find the GRAND TOTAL line.")
    for cat, (ct, pg) in category_totals.items():
        st = sum(float(r["cost"]) for r in rows if (r["_category"] or "").upper().startswith(cat[:12]))
        if abs(st - ct) > 0.5:
            review["mismatch"].append(
                f"Capital {year} {cat.title()}: projects add up to {fmt(st)}, the category total (page {pg}) is {fmt(ct)}."
            )
    return rows, checks


# ------------------------------------------------------------------- main

def write_csv(path, cols, rows):
    import csv
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def bullets(items, empty="None."):
    return "\n".join(f"- {i}" for i in items) if items else empty


def main():
    review = {"mismatch": [], "unclear": [], "checks": OrderedDict(), "notes": [],
              "programs": OrderedDict(), "inferred": OrderedDict(), "no_dept": OrderedDict(),
              "reconcile": OrderedDict()}

    budget_rows = []
    for year in sorted(OPERATING):
        rows, checks = operating(year, OPERATING[year], review)
        budget_rows += rows
        review["checks"][f"Operating budget {year}"] = checks

    cap_rows = []
    for year in sorted(CAPITAL):
        rows, checks = capital(year, CAPITAL[year], review)
        cap_rows += rows
        review["checks"][f"Capital budget {year}"] = checks

    write_csv(DATA / "budget.csv",
              ["year", "department", "gross_expenditure", "revenue", "net_budget", "source_url", "page"],
              budget_rows)
    write_csv(DATA / "capital_projects.csv",
              ["year", "project_name", "department", "cost", "funding_source", "source_url", "page"],
              cap_rows)

    # ---- review file
    out = ["# Budget: checks and items to review", "",
           "Generated by `scripts/extract_budget.py` from the Town of Ajax budget books in "
           "`sources/budgets/`. Re-run it after replacing or adding a book.", "",
           f"- `data/budget.csv`: {len(budget_rows)} rows (operating budget by department, "
           f"{min(OPERATING)}–{max(OPERATING)})",
           f"- `data/capital_projects.csv`: {len(cap_rows)} rows (capital projects with money in "
           f"the budget year, {min(CAPITAL)}–{max(CAPITAL)})", "",
           "## Totals checks", ""]
    for book, checks in review["checks"].items():
        out.append(f"**{book}**")
        out.append("")
        out += [f"- {c}" for c in checks] or ["- (no checks ran)"]
        out.append("")

    if review["reconcile"]:
        R = review["reconcile"]
        ys = list(R)

        def row(label, f):
            return f"| {label} | " + " | ".join(f(R[y]) for y in ys) + " |"

        out += [
            "## Why department totals don't match the town-wide page", "",
            "> **Note:** Adding up the departments gives slightly higher spending and revenue "
            "than the Town's own town-wide totals page. The gap is the same on both sides, so "
            "the amount paid by property tax (net budget) is not affected. It comes from how "
            "the town-wide page presents the Library and a few shared costs, not from missing "
            "or wrong numbers.", "",
            "Three things cause it, and together they account for the whole gap every year:", "",
            "1. **The Library is counted as one grant.** Department figures include the "
            "Library's full spending and its own revenue (fines, room bookings, grants, etc.). "
            "The town-wide page instead shows the Library as a single grant equal to its net "
            "cost, so the Library's revenue drops out of *both* spending and revenue.",
            "2. **The Library's debt payment is also listed separately.** The town-wide page also shows "
            "the Library's debenture (loan) payment, and the reserve money that pays for it, as "
            "separate lines, even though both are already inside the Library grant. This adds "
            "the same amount back to both sides.",
            "3. **A few costs only appear on the town-wide page.** Some utilities, contracted "
            "services and similar costs are on the town-wide page but not on any department "
            "page, and are matched by the same amount of recoveries (money paid back to the "
            "Town). The books don't say what they are for. The Library page has no utilities "
            "line, so they may be building costs the Town pays for the Library and recovers.",
            "",
            "| | " + " | ".join(str(y) for y in ys) + " |",
            "|---|" + "---:|" * len(ys),
            row("1. Library revenue left out of town-wide totals", lambda r: fmt(r["lib_rev"])),
            row("2. Library debt payment listed separately", lambda r: fmt(-r["repeated"])),
            row("3. Town-wide-only costs (matched by recoveries)", lambda r: fmt(-r["other_e"])),
            row("**Gap: spending**", lambda r: f"**{fmt(r['gap_e'])}**"),
            row("**Gap: revenue**", lambda r: f"**{fmt(r['gap_r'])}**"),
            "",
            *([
                "Where the spending and revenue gaps differ slightly, it's because the "
                "town-wide-only costs and their recoveries differ by that amount ("
                + ", ".join(f"{y}: costs {fmt(R[y]['other_e'])}, recoveries {fmt(R[y]['other_r'])}"
                            for y in ys if abs(R[y]['other_e'] - R[y]['other_r']) > 0.5)
                + "), which looks like rounding.", ""]
              if any(abs(R[y]['other_e'] - R[y]['other_r']) > 0.5 for y in ys) else []),
            "Item 3 by type of cost: " + "; ".join(
                f"{y}: " + ", ".join(f"{lab} {fmt(v)}" for lab, v in R[y]["other_lines"]) for y in ys
            ) + ".", "",
            "Pages used: town-wide totals " + ", ".join(f"{y} p.{R[y]['town_page']}" for y in ys)
            + "; Library " + ", ".join(f"{y} p.{R[y]['lib_page']}" for y in ys) + ".", "",
        ]

    out += ["## Mismatches", ""]
    other = review["mismatch"]
    out += [bullets(other, "No other mismatches."), ""]

    out += ["## Unclear values", "", bullets(review["unclear"]), ""]

    out += ["## Capital departments", "",
            "Most projects have a detail sheet naming the department. Where one didn't:", ""]
    for year, items in review["inferred"].items():
        out += [f"**{year}: department taken from the book's program-type table** "
                f"(Table 1, pages 6–7; the middle digits of the project number). {len(items)} projects:", "",
                bullets(items), ""]
    for year, items in review["no_dept"].items():
        out += [f"**{year}: department left blank** ({len(items)}):", "", bullets(items), ""]

    out += ["## Capital projects inside program sheets", "",
            "These projects don't have their own detail sheet. They're listed on a program "
            "(\"parent\") sheet whose funding covers the whole program, so their "
            "`funding_source` is the funding type tag from the project list (DC = Development "
            "Charges, LC = Life Cycle, CBC = Community Benefits Charges) and `page` points to "
            "the program sheet.", ""]
    for year, items in review["programs"].items():
        out += [f"**{year}** ({len(items)}):", "", bullets(items), ""]

    out += ["## Good to know", "",
            "- The 2023–2025 operating books label the budget-year column \"Requested\" even in "
            "their amended (final) editions; the 2026 book says \"Adopted\". The figures used are "
            "the ones printed in each amended book.",
            "- Departments were reorganized over these years (e.g. Legislative & Information "
            "Services in 2023–2024 became Corporate Services and Public & Strategic Affairs from "
            "2025), so a department's numbers can jump between years for that reason alone.",
            "- Stormwater Management is paid for entirely by the stormwater fee, so its net "
            "budget is 0. It has its own page from 2024 but isn't in the 2024 summary table.",
            "- `page` is the PDF page number (as shown by a PDF viewer), not the number printed "
            "on the page, though the two are usually the same. A range like `66-77` means the "
            "department is made up of several division pages.",
            ""]
    (DATA / "review").mkdir(parents=True, exist_ok=True)
    (DATA / "review" / "budget.md").write_text("\n".join(out))

    print(f"budget.csv: {len(budget_rows)} rows; capital_projects.csv: {len(cap_rows)} rows")
    for book, checks in review["checks"].items():
        print(book)
        for c in checks:
            print("  " + c)
    print("See data/review/budget.md")


if __name__ == "__main__":
    sys.exit(main())
