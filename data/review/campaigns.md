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
