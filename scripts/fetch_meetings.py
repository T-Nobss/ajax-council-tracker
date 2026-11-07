#!/usr/bin/env python3
"""
Collect Council and General Government Committee meetings for a council term
from the Town of Ajax's meeting portal (City Connections / civicflow).

    python3 scripts/fetch_meetings.py              # 2022-2026 term
    python3 scripts/fetch_meetings.py 2018-2022    # another term in terms.csv

For each Council, Special Council, General Government Committee and Special
GGC meeting in the term it:
  - adds a row to data/meetings.csv  (id, term_id, date, type, minutes_url)
    Rows for other terms already in the file are kept.
  - saves the minutes PDF to sources/minutes/
  - looks for "Remuneration" in agenda item titles and attachment names, and
    (for older meetings whose agenda is one PDF) in the agenda's text. Matching
    files are saved to sources/expenses/ and listed in
    data/review/remuneration-found.md
  - writes data/review/meetings.md with anything that needs checking

Safe to re-run: files already downloaded are skipped, so a re-run only fetches
what's new. The portal was being migrated in 2026 (older meetings were moved
over from the previous system, events.ajax.ca), so re-run it from time to time.

Needs Python 3.9+ and `pdftotext` (poppler-utils) for searching agenda PDFs.
"""

import csv
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MINUTES_DIR = ROOT / "sources" / "minutes"
EXPENSES_DIR = ROOT / "sources" / "expenses"
REVIEW = DATA / "review"

PORTAL = "https://ajax.cityconnections.civicflow.co"
SLUG = "town-of-ajax"
TYPES = {  # portal meeting type -> how meetings.csv writes it
    "Council": "Council",
    "Special Council": "Special Council",
    "General Government Committee": "General Government Committee",
    "Special GGC": "Special General Government Committee",
}
KEYWORD = re.compile(r"remuneration", re.I)
PAUSE = 0.5  # seconds between requests, to go easy on the Town's site
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"], start=1)}


# ------------------------------------------------------------------ fetching

def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": "ajax-council-tracker (public records project)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
                time.sleep(PAUSE)
                return (body, r.headers) if binary else body.decode("utf-8")
        except Exception as e:  # network hiccup: back off and retry
            if attempt == 3:
                raise
            time.sleep(2 ** (attempt + 1))
            last = e
    raise last


def page_data(html):
    """The data Next.js embeds in the page (self.__next_f.push chunks)."""
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.S)
    return "".join(json.loads('"' + c + '"') for c in chunks)


def json_after(raw, key):
    """Decode the JSON value that follows "key": in the page data."""
    i = raw.find(f'"{key}":')
    if i < 0:
        return None
    value, _ = json.JSONDecoder().raw_decode(raw, i + len(key) + 3)
    return value


def objects_with(raw, keys):
    """Every JSON object in the page data that has all of `keys`."""
    dec = json.JSONDecoder()
    out, seen = [], set()
    for m in re.finditer(r'\{"id":', raw):
        try:
            obj, _ = dec.raw_decode(raw, m.start())
        except ValueError:
            continue
        if isinstance(obj, dict) and all(k in obj for k in keys) and obj["id"] not in seen:
            seen.add(obj["id"])
            out.append(obj)
    return out


def safe_name(s):
    s = re.sub(r"[^\w.\- ]+", "", s).strip().replace(" ", "_")
    return s[:120] or "file"


def file_name(att):
    if att.get("fileName"):
        return att["fileName"]
    url = att.get("webUrl", "")
    return urllib.parse.unquote(url.rsplit("/", 1)[-1]) if url else (att.get("name") or "attachment")


def pdf_text(path):
    try:
        return subprocess.run(["pdftotext", "-layout", str(path), "-"],
                              capture_output=True, text=True, check=True).stdout
    except Exception:
        return ""


# ------------------------------------------------------------------- dates

def title_date(title):
    """Date written in a meeting title: '11-28-2022 ...' or 'June 22, 2026 ...'."""
    m = re.match(r"(\d{1,2})-(\d{1,2})-(\d{4})", title)
    if m:
        return date(int(m.group(3)), int(m.group(1)), int(m.group(2))).isoformat()
    m = re.match(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", title)
    if m and m.group(1).lower() in MONTHS:
        return date(int(m.group(3)), MONTHS[m.group(1).lower()], int(m.group(2))).isoformat()
    return None


# -------------------------------------------------------------------- main

def main():
    term_id = sys.argv[1] if len(sys.argv) > 1 else "2022-2026"
    with open(DATA / "terms.csv", newline="", encoding="utf-8") as f:
        term = next((t for t in csv.DictReader(f) if t["id"] == term_id), None)
    if not term:
        sys.exit(f"Term {term_id} isn't in data/terms.csv")
    start, end = term["start_date"], term["end_date"]

    print(f"Reading the meeting list from {PORTAL}/p/{SLUG} …")
    meetings = json_after(page_data(get(f"{PORTAL}/p/{SLUG}")), "meetings") or []
    print(f"  {len(meetings)} meetings listed in total")

    review = {"date_mismatch": [], "no_minutes": [], "cancelled": [], "not_yet": [], "errors": []}
    found = []  # remuneration matches
    rows = []
    today = date.today().isoformat()

    selected = []
    for m in meetings:
        if m.get("typeName") not in TYPES:
            continue
        # Times are stored as local time but labelled UTC, so use the date
        # as written (no time-zone conversion) and check it against the title.
        d = (m.get("start") or "")[:10]
        td = title_date(m.get("title", ""))
        if td and td != d:
            review["date_mismatch"].append(f"{m['title']} (portal id {m['id']}): start says {d}, title says {td}. Used {td}.")
            d = td
        if start <= d <= end:
            selected.append((d, m))
    selected.sort(key=lambda x: (x[0], x[1]["typeName"], x[1]["id"]))
    print(f"  {len(selected)} Council / GGC meetings between {start} and {end}")

    MINUTES_DIR.mkdir(parents=True, exist_ok=True)
    EXPENSES_DIR.mkdir(parents=True, exist_ok=True)
    used_ids = set()

    for n, (d, m) in enumerate(selected, 1):
        mtype = TYPES[m["typeName"]]
        slug = re.sub(r"[^a-z0-9]+", "-", mtype.lower()).strip("-")
        mid = f"{d}-{slug}"
        k = 2
        while mid in used_ids:
            mid, k = f"{d}-{slug}-{k}", k + 1
        used_ids.add(mid)
        page_url = f"{PORTAL}/p/{SLUG}/{m['id']}"
        label = f"{d} {mtype}"
        print(f"[{n}/{len(selected)}] {label}")

        if m.get("isCancelled"):
            review["cancelled"].append(f"{label}: {m.get('cancellationReason') or 'no reason given'} ({page_url})")
            rows.append({"id": mid, "term_id": term_id, "date": d, "type": mtype, "minutes_url": ""})
            continue

        try:
            raw = page_data(get(page_url))
        except Exception as e:
            review["errors"].append(f"{label}: couldn't load {page_url} ({e})")
            rows.append({"id": mid, "term_id": term_id, "date": d, "type": mtype, "minutes_url": ""})
            continue

        documents = json_after(raw, "documents") or []
        items = {o["id"]: o for o in objects_with(raw, ("title", "category", "sharePointAttachments"))}

        # ---- minutes: a meeting document named "Minutes"
        minutes_url = ""
        agenda = None  # (url, file name) of a one-PDF agenda, for older meetings
        for doc in documents:
            if doc.get("kind") != "meeting":
                continue
            for f_idx, att in enumerate(doc.get("sharePointAttachments") or []):
                name = f"{att.get('name', '')} {file_name(att)}"
                url = f"{PORTAL}/p/{SLUG}/documents/meeting/{m['id']}?f={f_idx}"
                if re.search(r"\bminutes\b", name, re.I) and not minutes_url:
                    minutes_url = url
                    dest = MINUTES_DIR / f"{mid}.pdf"
                    if not dest.exists():
                        try:
                            body, _ = get(url, binary=True)
                            dest.write_bytes(body)
                        except Exception as e:
                            review["errors"].append(f"{label}: minutes download failed ({e})")
                elif re.search(r"\bagenda\b", name, re.I) and agenda is None:
                    agenda = (url, file_name(att))
                # A meeting-level attachment named "…Remuneration…"
                if KEYWORD.search(name) and not re.search(r"\b(minutes|agenda)\b", name, re.I):
                    found.append(save_match(label, d, mtype, f"Meeting attachment", file_name(att), url, mid))
        if not minutes_url:
            (review["not_yet"] if d >= today else review["no_minutes"]).append(f"{label} ({page_url})")

        # ---- agenda items and their attachments (newer meetings)
        item_docs = {doc.get("contextItemId") or doc.get("id"): doc for doc in documents if doc.get("kind") == "item"}
        for item in items.values():
            title = item.get("title") or ""
            doc = item_docs.get(item["id"])
            atts = (doc or {}).get("sharePointAttachments") or []
            title_hit = bool(KEYWORD.search(title))
            for f_idx, att in enumerate(atts):
                fname = file_name(att)
                if title_hit or KEYWORD.search(f"{att.get('name', '')} {fname}"):
                    url = f"{PORTAL}/p/{SLUG}/documents/item/{doc['id']}?f={f_idx}"
                    found.append(save_match(label, d, mtype, f"Agenda item: {title}", fname, url, mid))
            if title_hit and not atts:
                found.append({"date": d, "type": mtype, "where": f"Agenda item: {title}",
                              "file": "(no attachment)", "url": page_url, "saved": ""})

        # ---- older meetings: agenda is one PDF, items are inside it
        if agenda and not items:
            url, fname = agenda
            tmp = EXPENSES_DIR / f".agenda-{mid}.pdf"
            try:
                body, _ = get(url, binary=True)
                tmp.write_bytes(body)
                pages = pdf_text(tmp).split("\f")
                hits = [(i, ln.strip()) for i, p in enumerate(pages, 1)
                        for ln in p.splitlines() if KEYWORD.search(ln)]
                if hits:
                    dest = EXPENSES_DIR / f"{mid}-{safe_name(fname)}"
                    tmp.replace(dest)
                    pages_hit = sorted({i for i, _ in hits})
                    first = hits[0][1][:120]
                    found.append({"date": d, "type": mtype,
                                  "where": f"Inside the agenda PDF, page(s) {', '.join(map(str, pages_hit))}: “{first}”",
                                  "file": fname, "url": url, "saved": str(dest.relative_to(ROOT))})
                else:
                    tmp.unlink(missing_ok=True)
            except Exception as e:
                tmp.unlink(missing_ok=True)
                review["errors"].append(f"{label}: couldn't search the agenda PDF ({e})")

        rows.append({"id": mid, "term_id": term_id, "date": d, "type": mtype, "minutes_url": minutes_url})

    write_outputs(term_id, start, end, rows, found, review, len(meetings))


def save_match(label, d, mtype, where, fname, url, mid):
    dest = EXPENSES_DIR / f"{mid}-{safe_name(fname)}"
    saved = ""
    try:
        if not dest.exists():
            body, _ = get(url, binary=True)
            dest.write_bytes(body)
        saved = str(dest.relative_to(ROOT))
    except Exception as e:
        saved = f"(download failed: {e})"
    return {"date": d, "type": mtype, "where": where, "file": fname, "url": url, "saved": saved}


def write_outputs(term_id, start, end, rows, found, review, listed):
    # meetings.csv: replace this term's rows, keep others.
    path = DATA / "meetings.csv"
    cols = ["id", "term_id", "date", "type", "minutes_url"]
    kept = []
    if path.exists():
        with open(path, newline="", encoding="utf-8") as f:
            kept = [r for r in csv.DictReader(f) if r.get("term_id") != term_id]
    all_rows = sorted(kept + rows, key=lambda r: (r["date"], r["type"], r["id"]))
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        w.writeheader()
        w.writerows(all_rows)

    REVIEW.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    lines = ["# Remuneration found in meeting documents", "",
             f"Generated by `scripts/fetch_meetings.py` on {today}, for the {term_id} term "
             f"({start} to {end}).", "",
             "Agenda items or attachments with **Remuneration** in their title. For older "
             "meetings, whose agenda is a single PDF, the agenda text itself was searched. "
             "Saved copies are in `sources/expenses/`.", ""]
    if found:
        lines += ["| Meeting date | Meeting | Where | File | Saved as |", "|---|---|---|---|---|"]
        for x in sorted(found, key=lambda x: x["date"]):
            lines.append(f"| {x['date']} | {x['type']} | {x['where'].replace('|', '/')} | "
                         f"[{x['file'].replace('|', '/')}]({x['url']}) | {x['saved'] or '—'} |")
    else:
        lines.append("Nothing found.")
    (REVIEW / "remuneration-found.md").write_text("\n".join(lines) + "\n")

    with_minutes = sum(1 for r in rows if r["minutes_url"])
    sec = lambda title, items, empty="None.": [f"## {title}", "", *([f"- {i}" for i in items] or [empty]), ""]
    out = ["# Meetings: items to review", "",
           f"Generated by `scripts/fetch_meetings.py` on {today}, for the {term_id} term.", "",
           f"- {listed} meetings listed on the portal in total",
           f"- {len(rows)} Council / GGC meetings in this term written to `data/meetings.csv`",
           f"- {with_minutes} with minutes saved in `sources/minutes/`",
           f"- {len(found)} remuneration match(es), see `remuneration-found.md`", "",
           "The portal (City Connections) was being updated in 2026, with older meetings "
           "migrated from the previous system. Re-run the script to pick up changes.", ""]
    out += sec("Past meetings with no minutes on the portal", review["no_minutes"])
    out += sec("Upcoming meetings (no minutes yet)", review["not_yet"])
    out += sec("Cancelled meetings", review["cancelled"])
    out += sec("Date in the title differs from the listed start date", review["date_mismatch"])
    out += sec("Errors", review["errors"])
    (REVIEW / "meetings.md").write_text("\n".join(out))

    print(f"\n{len(rows)} meetings written; {with_minutes} with minutes; "
          f"{len(found)} remuneration match(es). See data/review/meetings.md")


if __name__ == "__main__":
    main()
