# Campaign finances (Form 4) – review notes

Source: each candidate's Form 4 Financial Statement – Auditor's Report, posted by
the Town of Ajax. Copies are kept in `sources/campaigns/<year>/`.

Rules applied:

- The Form 4 figures are official. `campaigns.csv` copies them exactly.
- `donations.csv` lists only donors whose total is **over $100**. Contributions of
  $100 or less appear only as a combined total (`contributions_100_or_less`).
- Only the donor's municipality is recorded. Street addresses and postal codes are
  never copied. (Postal codes are read only to check the municipality.)
- Town names are recorded as written. A town that conflicts with its postal code
  is flagged in the `flag` column.
- Nothing is guessed. Anything unclear is listed below.

---

## 2022 – Sterling Lee (Regional Councillor, Ward 2) – elected

File: `sources/campaigns/2022/Form-4-Financial-Statement-Sterling-Lee.pdf`
(22 scanned pages, rotated; every even page is a blank back side).

| PDF page | Contents |
|---|---|
| 1 | Box A/B: candidate, office, campaign period, spending limits |
| 3, 5 | Box C: income and expenses summary |
| 7 | Schedule 1 (contributions) – Table 3 says "per list" |
| 9 | Table 3 continued ("per list") |
| 11 | Schedule 2 (fundraising events) – blank |
| 13 | Auditor's Report form – Gordon Peters, CPA, Turner Moore LLP, Ajax, 2023/03/17 |
| 15, 17 | Attached donor list (typed spreadsheet with handwritten corrections) |
| 19, 21 | Auditor's report (qualified opinion) |

### Reconciliation to line 1B

| | Amount |
|---|---:|
| Attached list, typed total (p. 17) | $22,480.00 |
| Crossed out by hand on p. 15: Teon $50, Mir $30, Clendinneng $50 (handwritten "+130") | −$130.00 |
| **= Line 1B on the form** (also written by hand at the top of p. 15: "$22,350") | **$22,350.00** |

The three crossed-out amounts ($130) match the form's "contributions of $100 or
less" line exactly, so they were moved out of the list and into that line.
Total contributions also check: $300 (candidate, goods) + $130 + $22,350 = $22,780 (line 1A).

### Rules 2 and 3 conflict for this filing (decided: keep rule 3)

Line 1B ($22,350) still includes **six contributions of exactly $100**
(total $600), from the list on pp. 15 and 17. They are "not over $100", so under
rule 3 they are **not** in `donations.csv`:

| Donor | Amount |
|---|---:|
| Carol Trewin | $100.00 |
| Edward Schlegel | $100.00 |
| Rob Schlegel | $100.00 |
| Michael Schmidt | $100.00 |
| James Schlegel | $100.00 |
| Ron Schlegel | $100.00 |

So `donations.csv` adds to **$21,750.00**, which is line 1B minus $600.
(Strictly, the form's line 1B is for contributions *exceeding* $100, so the
candidate appears to have put these $100 donations on the wrong line.)

**Decision (owner, 2026-11-08):** keep rule 3. The six $100 donors aren't
listed, and the $600 gap is explained in `donations_note`. That note appears behind
the "i" next to "Donors over $100" on Sterling Lee's profile.

### Flags

| Donor | Written town | Issue |
|---|---|---|
| Frank Marchio | Ajax | Postal code is a Toronto (M6E) code; list marks the donor as not an Ajax resident ("N"). |
| Anthony Montemarano | Ajax | Postal code is a Thornhill/Markham (L3T) code; list marks the donor "N". |
| Daniel Mak | Klienburg | Spelled as written (likely Kleinburg). |

### Other notes

- Campaign result: elected (Regional Councillor, Ward 2, 2022).
- Deficit of $77.38 (line D1/D2) recorded as `-77.38`.
- The auditor's opinion is qualified (pp. 19, 21). Not summarized here.

---

## 2022 – Marilyn Crawford (Regional Councillor, Ward 1) – elected

File: `Form-4-Financial-Statement-Marilyn-Crawford.pdf` (8 pages, typed form, no attachments).

- Donor rows (Table 3, p. 5) add up to **$6,600.00 = line 1B**. ✓
- Line 1A check: $11.00 (candidate, money) + $1,575.00 (candidate, goods: 300 signs from 2018) + $450.00 + $6,600.00 = $8,636.00. ✓
- Expenses check: C2 $8,276.05 + C3 $359.95 = C5 $8,636.00. ✓
- **The spending limits and contribution limit in Box A are blank** on the form. Left blank in `campaigns.csv`.
- Box D (surplus/deficit) is blank. Income equals expenses ($8,636.00), so it works out to zero, but the line itself was not filled in. Left blank.
- Declaration dated 2022/10/26; filed 2022/11/04, before the campaign period ended (2022/12/31). Marked as the initial filing.
- No auditor's report. Not required: contributions and expenses were under $10,000.
- Harold Green's address has no postal code, so his town (Ajax) couldn't be cross-checked.
- "Adrian Lambert" here; spelled "Adran Lambert" on Rob Tyler Morin's list. Both recorded as written.

## 2022 – Joanne Dies (Regional Councillor, Ward 3) – elected

File: `Form-4-Financial-Statement-Joanne-Dies.pdf` (7 pages, typed form, no attachments).

- Donor rows (Table 3, p. 5) add up to **$2,050.00 = line 1B**. ✓
- Line 1A check: $5,849.76 (candidate, money) + $530.91 (candidate, goods: 52 signs from 2018) + $275.00 + $2,050.00 = $8,705.67. ✓
- Expenses check: C2 $8,355.67 + C3 $350.00 = C5 $8,705.67. ✓
- **Parties limit is written as $350.00.** That doesn't match the usual 10% of the general limit ($30,786.45 → $3,078.65, which is what Lisa Bower's form shows for the same limit). Recorded as written.
- Box D is blank (income equals expenses). Left blank.
- No auditor's report (under $10,000).
- Table 3 has "Mr Thomas Collier"; recorded as "Thomas Collier" (title dropped only).

## 2022 – Rob Tyler Morin (Local Councillor, Ward 1) – elected

File: `Form-4-Financial-Statement-Rob-Tyler-Morin.pdf` (14 pages; even pages are blank backs).
Table 3 says "See Attached List" ($16,850.00); the list is on p. 7 ("Table 1 – Contributions greater than $100").

- Attached list total: **$16,850.00 = line 1B**, no handwritten changes.
- Same issue as Sterling Lee: the list includes **one donation of exactly $100** (Lori Murphy, 2022-06-02) inside line 1B. Under the over-$100 rule it isn't listed, so the rows add up to **$16,750.00** ($100 less). Explained in `donations_note` (shown behind the "i" on the profile).
- The form's "$100 or less" line is blank.
- Line 1A check: $1,545.00 (candidate, goods: 309 signs from 2018) + $16,850.00 = $18,395.00. ✓ Money from candidate is blank.
- Income: $18,395.00 + $1.00 (items $25 or less) = $18,396.00 (C1).
- Expenses check: C2 $16,761.82 + C3 $951.64 + C4 $1,148.96 = C5 $18,862.42; deficit −$466.42. ✓
- Auditor: Kimberly Copetti, CPA, Copetti & Co., Whitby, 2023/03/20 (pp. 9–13; qualified opinion – not summarized).
- Towns as written: "Brooklin" and "Ashburn" are communities in Whitby. Postal codes all match. "Adran Lambert", "Peter Mavroukas" as written.

## 2022 – Nancy Henry (Local Councillor, Ward 2) – elected

File: `Form-4-Financial-Statement-Nancy-Henry.pdf` (18 pages; even pages are blank backs).

- Donor rows (Table 3, p. 9) add up to **$6,300.00 = line 1B**. ✓
- Line 1A check: $4,068.66 (candidate, money) + $6,300.00 = $10,368.66. ✓
- Expenses check: C2 $10,359.88 + C4 $859.50 = C5 $11,219.38; deficit −$850.72. ✓ C3 (parties) is blank.
- Campaign period on the form: **2022/08/19 to 2023/01/03** (not December 31). Recorded start date only.
- Parties limit written as $2,659.23 (Sterling Lee's form shows $2,659.25 for the same ward limit). Recorded as written.
- The form pages are numbered "of 8", but the posted copy has 7 form pages (p. 7 of 8 is the auditor's page) plus the audit report. Page 8 of 8 isn't in the posted file.
- Auditor: Andrew Tully, CPA, Ritchie Shortt & Tully LLP, Whitby, 2023/03/22 (pp. 13–17; qualified opinion – not summarized).
- **Compliance Audit Committee decision** linked on the profile with its title only, as the Town lists it: "Notice of Decision – CAC-2023-02 – N. Henry" (`data/campaign_documents.csv`). The PDF's own heading is "Notice of Decision – Town of Ajax Compliance Audit Committee", application CAC-2023-02. The `description` column is empty, waiting for your one-line description.

## 2022 – Lisa Bower (Local Councillor, Ward 3) – elected

File: `Form-4-Financial-Statement-Lisa-Bower.pdf` (8 pages). Table 3 lists 8 donors and ticks "additional information … on separate attachment"; the 4 more donors are on p. 8 ("Supplementary Schedule").

- Table 3 ($5,850.00) + supplementary schedule ($2,000.00) = **$7,850.00 = line 1B**. ✓ (Table 3's own Total box is blank.)
- Line 1A check: $10.08 (candidate, money) + $1,875.00 (candidate, goods: 300 signs from 2018) + $225.00 + $7,850.00 = $9,960.08. ✓
- **Small inconsistency on the form:** Box C lists contributions as $9,960.00 plus $0.08 interest (= $9,960.08 C1), while Schedule 1 line 1A is $9,960.08 (it counts the $10.08 from the candidate). Recorded 1A ($9,960.08) as total contributions and $9,960.08 as total income, as written.
- Expenses check: C2 $8,760.08 + C3 $1,200.00 = C5 $9,960.08. ✓ Surplus written as 0.
- No auditor's report (under $10,000).
- Names as written: "James Van Dusen" (Bower), "James Vandusen" (Tyler Morin), "Jim Vandusen" (Crawford), "Jim VanDusen" (Lee).

## Not yet done

- Shaun Collier and Ashmeed Khan (2022) – PDFs are in `sources/campaigns/2022/`.
