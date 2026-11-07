#!/usr/bin/env python3
"""
Extract motions and named (recorded) votes from the minutes in sources/minutes/.

    python3 scripts/extract_motions.py                     # every minutes file
    python3 scripts/extract_motions.py 2023-03-27-council  # only these meetings

Writes data/motions.csv and data/votes.csv (rows for the meetings processed are
replaced; other meetings' rows are kept) and data/review/votes.md.

How the minutes are read
------------------------
A motion starts at "Moved by: <name>", then "Seconded by: <name>", then the
motion text, and ends at a result line on its own (CARRIED, DEFEATED, LOST,
CARRIED on 2/3rds, ...). The agenda item is the nearest heading above it
("5.4 Delegation: ...", "Item 6.6"). A recorded vote is a block like

    Recorded Vote:
    In Favour:  Mayor Collier, Regional Councillor Lee, ...
    Opposed:    Councillor Bower, ...

Names are matched to councillors.csv through its `aliases` column, and only
against members who held a seat on the meeting date. Mover and seconder are
written as councillor ids. Spaces inside words are ignored when matching,
because the PDF text sometimes splits words ("Counci llor").

Needs pdftotext (poppler-utils).
"""

import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MINUTES = ROOT / "sources" / "minutes"
COUNCIL_SIZE = 7

RESULT = re.compile(
    r"^(?:MOTION\s+)?(CARRIED|DEFEATED|LOST|WITHDRAWN|DEFERRED|TABLED|REFERRED|FAILED)\b[A-Za-z0-9/ ,.()'-]*$")
# Labels written just above a motion: "Main Motion", "Amendment", ...
KIND = re.compile(r"^(Main Motion(?: as Amended)?|Amendment(?: to the Amendment)?|Amended Motion|Referral Motion|"
                  r"Deferral Motion|Motion to Refer|Motion to Defer|Motion to Table|Substantive Motion|"
                  r"Motion \d+|Motion to Amend|Motion as Amended|Amended Main Motion)$", re.I)
# Labels that mean the motion before was replaced before a vote on it.
SUPERSEDES = re.compile(r"amend|refer|defer|table|motion \d", re.I)
MOVED = re.compile(r"^Moved\s*by\s*:?\s*(.*)$", re.I)
SECONDED = re.compile(r"^Seconded\s*by\s*:?\s*(.*)$", re.I)
VOTE_LABEL = re.compile(r"^(In\s*Fav\s*ou?r|Opposed|Absent|Abstain(?:ed)?|Declared\s+(?:a\s+)?Conflict)\s*:?\s*(.*)$", re.I)
RECORDED = re.compile(r"^Recorded\s*Vote\s*:?\s*$", re.I)
HEADING = re.compile(r"^(?:Item\s+)?(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(\S.{2,})$")
NOISE = re.compile(
    r"^(Page \d+( of \d+)?|\d{1,3}|_{5,}|.*Minutes\s*[-–]\s*\w+ \d{1,2}, \d{4}.*"
    r"|Town of Ajax .*Meeting\s*[-–]\s*\w+ \d{1,2}, \d{4}"
    r"|(Special )?(Council|General Government Committee)( Meeting)?\s*[-–]?\s*\w+ \d{1,2},? \d{4})$", re.I)


def squash(s):
    """Lower-case, letters only: 'Counci llor  Dies ,' -> 'councillordies'.
    Common misspellings in the minutes ('Counicllor', 'Councilor',
    'Cuncillor') are read as 'councillor'."""
    s = re.sub(r"[^a-z]", "", s.lower())
    return re.sub(r"c[ou]{0,2}n[ic]{1,3}l{1,2}or", "councillor", s)


TITLE_WORDS = {"mayor", "deputy", "regional", "reg", "councillor", "councilor", "counicllor",
               "cuncillor", "counci", "llor", "ional", "and"}


def name_like(line):
    """True if a line looks like (more of) a list of names, not narrative."""
    if re.search(r"\d|resumed|recessed|chair|meeting|motion|vote", line, re.I):
        return False
    for chunk in line.split(","):
        words = chunk.replace(".", " ").split()
        if len(words) > 5:
            return False
        if any(w[0].islower() and w.lower() not in TITLE_WORDS for w in words):
            return False
    return bool(line.strip())


def continues(prev, line):
    """Should `line` be joined to the names list ending with `prev`?"""
    if not name_like(line):
        return False
    tail = prev.rstrip()
    return (tail.endswith(",") or tail.split()[-1].lower().strip(",") in TITLE_WORDS
            or re.match(r"^(Mayor|Deputy|Regional|Reg|Councillor|Counci)", line) is not None
            or len(tail.split(",")[-1].split()) <= 2)


def load_people():
    with open(DATA / "councillors.csv", newline="", encoding="utf-8") as f:
        people = list(csv.DictReader(f))
    with open(DATA / "seats.csv", newline="", encoding="utf-8") as f:
        seats = list(csv.DictReader(f))
    with open(DATA / "terms.csv", newline="", encoding="utf-8") as f:
        terms = {t["id"]: t for t in csv.DictReader(f)}
    for p in people:
        p["alias_keys"] = {squash(a) for a in (p.get("aliases") or p["name"]).split(";") if a.strip()}
        p["terms"] = [(terms[s["term_id"]]["start_date"], terms[s["term_id"]]["end_date"])
                      for s in seats if s["councillor_id"] == p["id"] and s["term_id"] in terms]
    return people


def match(name, people, when):
    """Councillor id for a name on a date, or None. Members sitting that day only."""
    key = squash(name)
    if not key:
        return None
    sitting = [p for p in people if any(a <= when <= b for a, b in p["terms"])]
    hits = [p["id"] for p in sitting if key in p["alias_keys"]]
    return hits[0] if len(hits) == 1 else None


def split_names(text):
    text = re.sub(r"\s+and\s+", ",", text)
    return [n.strip(" .;") for n in text.split(",") if n.strip(" .;")]


OCR_TEXT = ROOT / "sources" / "minutes-text"


def read_lines(pdf):
    """Text lines of a minutes PDF. Scanned minutes have no text layer, so
    their OCR text from sources/minutes-text/ (scripts/ocr_minutes.sh) is used."""
    text = subprocess.run(["pdftotext", "-layout", str(pdf), "-"],
                          capture_output=True, text=True).stdout
    if len(re.sub(r"\s", "", text)) < 200:
        ocr = OCR_TEXT / f"{pdf.stem}.txt"
        text = ocr.read_text() if ocr.exists() else ""
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("’", "'")
    lines = []
    for raw in text.splitlines():
        s = re.sub(r"\s+", " ", raw).strip()
        if s and not NOISE.match(s):
            lines.append(s)
    return lines


def parse_meeting(meeting_id, when, people, review, is_council):
    pdf = MINUTES / f"{meeting_id}.pdf"
    lines = read_lines(pdf)
    motions, votes = [], []
    item = ""
    kind = ""
    i = 0
    n = 0
    while i < len(lines):
        s = lines[i]
        if KIND.match(s):
            kind = s.title()
        h = HEADING.match(s)
        if h and not MOVED.match(s) and len(s) < 160:
            item = f"{h.group(1)} {h.group(2)}".strip()
            kind = ""
        m = MOVED.match(s)
        if not m:
            i += 1
            continue

        # ---- one motion
        mover_raw = m.group(1)
        seconder_raw = ""
        sm = re.search(r"Seconded\s*by\s*:?\s*(.*)$", mover_raw, re.I)
        if sm:  # both on one line
            seconder_raw, mover_raw = sm.group(1), mover_raw[:sm.start()]
        i += 1
        if i < len(lines) and SECONDED.match(lines[i]):
            seconder_raw = SECONDED.match(lines[i]).group(1)
            i += 1
        body, result, groups, current = [], "", {}, None
        recorded = False
        next_kind = ""
        while i < len(lines):
            s = lines[i]
            if MOVED.match(s):
                break  # next motion starts: this one had no result line
            if KIND.match(s):
                next_kind = s.title()  # label for the motion that follows
                i += 1
                continue
            if RESULT.match(s) and s.split()[0].isupper():
                result = s
                i += 1
                # A recorded vote is printed after the result.
                if i < len(lines) and (RECORDED.match(lines[i]) or VOTE_LABEL.match(lines[i])):
                    while i < len(lines):
                        t = lines[i]
                        v = VOTE_LABEL.match(t)
                        if RECORDED.match(t):
                            recorded = True
                        elif v:
                            label = re.sub(r"\s+", "", v.group(1)).lower()
                            current = "in favour" if label.startswith("infav") else label
                            groups.setdefault(current, []).append(v.group(2))
                            recorded = True
                        elif current and continues(groups[current][-1], t):
                            groups[current].append(t)
                        else:
                            break
                        i += 1
                break
            if RECORDED.match(s):
                recorded = True
                current = None
            elif VOTE_LABEL.match(s):
                v = VOTE_LABEL.match(s)
                label = re.sub(r"\s+", "", v.group(1)).lower()
                label = "in favour" if label.startswith("infav") else label
                current = label
                groups.setdefault(current, []).append(v.group(2))
                recorded = True
            elif current and groups[current] and continues(groups[current][-1], s):
                groups[current].append(s)  # wrapped list of names
            else:
                current = None
                body.append(s)
            i += 1
        n += 1
        mid = f"{meeting_id}-m{n:02d}"
        this_kind, kind = kind, ""
        text = re.sub(r"\s+", " ", " ".join(body)).replace("•", "-").strip()

        if squash(seconder_raw) in ("none", "noseconder"):
            seconder_raw = ""  # e.g. an amendment that "LOST (no seconder)"
        mover = match(mover_raw, people, when)
        seconder = match(seconder_raw, people, when) if seconder_raw else ""
        if not mover:
            review["unmatched"].append(f"{mid} ({item[:60]}): mover '{mover_raw or '(missing)'}' didn't match a member")
        if seconder_raw and not seconder:
            review["unmatched"].append(f"{mid} ({item[:60]}): seconder '{seconder_raw}' didn't match a member")
        if not seconder_raw and is_council and "no seconder" not in result.lower():
            review["unclear"].append(f"{mid} ({item[:60]}): Council motion with no seconder")
        if not result and next_kind and SUPERSEDES.search(next_kind):
            result = f"(not voted on directly: followed by {next_kind.lower()})"
            review["superseded"].append(f"{mid} ({item[:60]}): followed by {next_kind}")
        elif not result:
            review["unclear"].append(f"{mid} ({item[:60]}): no result line found before the next motion or the end")
        kind = next_kind

        named, conflicted = {}, set()
        if groups.get("in favour") is not None or groups.get("opposed") is not None:
            for label, vote in (("in favour", "Yes"), ("opposed", "No"), ("absent", "Absent"),
                                ("abstain", "Abstain"), ("abstained", "Abstain")):
                listed = " ".join(groups.get(label, []))
                if re.match(r"^\s*(none|nil)\b", listed, re.I):
                    listed = ""
                for name in split_names(listed):
                    if squash(name) in ("none", "nil", ""):
                        continue
                    cid = match(name, people, when)
                    if not cid:
                        review["unmatched"].append(f"{mid}: '{name}' in {label} didn't match a member")
                        continue
                    if cid in named and named[cid] != vote:
                        review["failed"].append(
                            f"{mid}: the minutes list {cid} as both {named[cid]} and {vote}; "
                            f"no vote recorded for them on this motion")
                        conflicted.add(cid)
                    named[cid] = vote
            for cid in conflicted:
                named.pop(cid, None)
            yes = sum(v == "Yes" for v in named.values())
            no = sum(v == "No" for v in named.values())
            if yes + no > COUNCIL_SIZE:
                review["failed"].append(f"{mid}: {yes} in favour + {no} opposed = {yes + no}, more than {COUNCIL_SIZE}")
            if result and (("CARRIED" in result and yes <= no) or (re.match(r"(DEFEATED|LOST)", result) and yes > no)):
                review["unclear"].append(f"{mid}: result '{result}' but {yes} in favour, {no} opposed")
        elif recorded:
            review["unclear"].append(f"{mid} ({item[:60]}): 'Recorded Vote' but no In Favour / Opposed list found")

        motions.append({"id": mid, "meeting_id": meeting_id,
                        "item": f"{item} ({this_kind})" if this_kind else item, "text": text,
                        "mover": mover or mover_raw, "seconder": seconder or seconder_raw,
                        "result": result, "recorded_vote": "yes" if named else "no"})
        for cid, vote in named.items():
            votes.append({"motion_id": mid, "councillor_id": cid, "vote": vote})
    return motions, votes


def merge_write(path, cols, new_rows, meeting_ids, key):
    keep = []
    if path.exists():
        with open(path, newline="", encoding="utf-8") as f:
            keep = [r for r in csv.DictReader(f) if key(r) not in meeting_ids]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(keep + new_rows, key=lambda r: r[cols[0]]))


def main():
    with open(DATA / "meetings.csv", newline="", encoding="utf-8") as f:
        meetings = {m["id"]: m for m in csv.DictReader(f)}
    wanted = sys.argv[1:] or sorted(p.stem for p in MINUTES.glob("*.pdf"))
    people = load_people()
    review = {"failed": [], "unmatched": [], "unclear": [], "superseded": [], "ocr": []}
    all_m, all_v, done = [], [], []
    for mid in wanted:
        if mid not in meetings or not (MINUTES / f"{mid}.pdf").exists():
            review["unclear"].append(f"{mid}: no meeting row or minutes file")
            continue
        m, v = parse_meeting(mid, meetings[mid]["date"], people, review,
                             is_council="Council" in meetings[mid]["type"])
        if (OCR_TEXT / f"{mid}.txt").exists() and m:
            review["ocr"].append(f"{mid}: {len(m)} motions, {sum(r['recorded_vote'] == 'yes' for r in m)} recorded votes")
        if not m:
            review["unclear"].append(f"{mid}: no motions found in the minutes")
        all_m += m
        all_v += v
        done.append(mid)

    done_set = set(done)
    merge_write(DATA / "motions.csv",
                ["id", "meeting_id", "item", "text", "mover", "seconder", "result", "recorded_vote"],
                all_m, done_set, lambda r: r["meeting_id"])
    merge_write(DATA / "votes.csv", ["motion_id", "councillor_id", "vote"],
                all_v, done_set, lambda r: r["motion_id"].rsplit("-m", 1)[0])

    rec = sum(1 for m in all_m if m["recorded_vote"] == "yes")
    out = ["# Votes: checks", "",
           f"Generated by `scripts/extract_motions.py` for {len(done)} meeting(s): "
           + ", ".join(done[:10]) + (" …" if len(done) > 10 else ""), "",
           f"- {len(all_m)} motions written to `data/motions.csv`",
           f"- {rec} with a recorded vote; {len(all_v)} named votes written to `data/votes.csv`", "",
           "Checks: every name must match a member sitting on the meeting date (via the "
           "`aliases` column in `councillors.csv`); In Favour + Opposed can't exceed "
           f"{COUNCIL_SIZE}; nobody can be on both sides; a CARRIED result should have more "
           "in favour than opposed.", ""]
    for title, key in (("Failed checks", "failed"), ("Names that didn't match", "unmatched"),
                       ("Unclear", "unclear"),
                       ("Moved but not voted on directly (replaced by an amendment, referral or split; "
                        "the vote that followed is recorded as its own motion)", "superseded"),
                       ("From scanned minutes (read with OCR; spot-check these)", "ocr")):
        out += [f"## {title}", "", *([f"- {x}" for x in review[key]] or ["None."]), ""]
    (DATA / "review" / "votes.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
