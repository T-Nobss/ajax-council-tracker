"use client";

import InfoHeading from "../components/InfoHeading";
import { Diff, Money, fmtFull, pdfPage } from "./format";

// Plain-language meanings for the statement's revenue lines.
const REVENUE_HELP = {
  "Net taxation": "property taxes kept by the Town",
  "Taxation from other governments": "payments instead of taxes from governments that don't pay property tax",
  "User charges": "fees for programs, rentals, permits and services",
  "Government transfers": "grants from the federal and provincial governments",
  "Gaming and casino revenue": "the Town's share of Casino Ajax revenue",
  "Obligatory reserve funds earned": "development charges and federal gas tax money used during the year",
  "Investment income": "interest and returns on the Town's savings",
  "Income from government business enterprise": "the Town's share of Elexicon (its electricity company) profits",
  "Donations and contributions from developers": "roads, parks and other assets handed over by developers",
  "Gain or loss on sale of assets": "profit or loss when the Town sells land, vehicles or equipment",
};

function Table({ rows, firstCol }) {
  const total = rows.reduce(
    (t, r) => ({ budget: t.budget + r.budget, actual: t.actual + r.actual }),
    { budget: 0, actual: 0 }
  );
  return (
    <div className="table-wrap">
      <table className="data-table budget-table">
        <thead>
          <tr>
            <th scope="col">{firstCol}</th>
            <th scope="col" className="num">Budget</th>
            <th scope="col" className="num">Actual</th>
            <th scope="col" className="num">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <th scope="row">{r.category}</th>
              <td className="num"><Money value={r.budget} /></td>
              <td className="num"><Money value={r.actual} /></td>
              <td className="num"><Diff value={r.actual - r.budget} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td className="num"><Money value={total.budget} /></td>
            <td className="num"><Money value={total.actual} /></td>
            <td className="num"><Diff value={total.actual - total.budget} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// The "Actual" tab: results from the audited financial statements.
export default function ActualView({ year, actuals }) {
  if (!actuals) {
    return (
      <div className="notice">
        Actual results for {year} aren&rsquo;t available yet. They come from
        the Town&rsquo;s audited financial statements, which are usually
        published in the middle of the following year.
      </div>
    );
  }

  const { revenue, expense, source, page } = actuals;
  const sum = (rows, col) => rows.reduce((t, r) => t + r[col], 0);
  const rev = { budget: sum(revenue, "budget"), actual: sum(revenue, "actual") };
  const exp = { budget: sum(expense, "budget"), actual: sum(expense, "actual") };
  const surplus = { budget: rev.budget - exp.budget, actual: rev.actual - exp.actual };
  const link = pdfPage(source, page);

  return (
    <>
      <InfoHeading title={`${year} results`} label="actual results">
        <p>
          These are the Town&rsquo;s actual results for {year}, from its{" "}
          <a href={link} target="_blank" rel="noopener noreferrer">
            audited financial statements
          </a>{" "}
          (statement of operations, page {page}).
        </p>
        <p>
          <strong>They&rsquo;re counted differently from the budget books.</strong>{" "}
          The statements group spending by <em>service area</em> (such as
          Transportation or Recreation and culture), not by department. They
          also count buildings, roads and vehicles as a cost spread over their
          useful life, instead of when they&rsquo;re bought. That&rsquo;s why
          these figures don&rsquo;t match the Planned tab.
        </p>
        <p>
          The <strong>Budget</strong> column here is the Town&rsquo;s own
          budget, restated by the Town on the same basis as the actual results
          (explained in the statements&rsquo; &ldquo;Budget figures&rdquo;
          note), so budget and actual can be compared fairly.
        </p>
        <p>
          <strong>Annual surplus</strong> is revenue minus expenses. A surplus
          doesn&rsquo;t mean unspent cash: much of it is money set aside in
          reserves or invested in long-lasting assets like roads and buildings.
        </p>
        <p>
          The statements include the Ajax Public Library and the Town&rsquo;s
          share of Elexicon, its electricity company.
        </p>
      </InfoHeading>

      <ul className="stats">
        <li>
          <span className="stat-label">Revenue</span>
          <strong className="stat-value">{fmtFull(rev.actual)}</strong>
          <span className="stat-sub">Budget {fmtFull(rev.budget)}</span>
        </li>
        <li>
          <span className="stat-label">Expenses</span>
          <strong className="stat-value">{fmtFull(exp.actual)}</strong>
          <span className="stat-sub">Budget {fmtFull(exp.budget)}</span>
        </li>
        <li>
          <span className="stat-label">Annual surplus</span>
          <strong className="stat-value">{fmtFull(surplus.actual)}</strong>
          <span className="stat-sub">Budget {fmtFull(surplus.budget)}</span>
        </li>
      </ul>

      <InfoHeading title="Spending by service area" label="spending by service area">
        <p>As the financial statements describe them:</p>
        <ul className="help-list">
          <li>
            <strong>General government:</strong> costs of running the Town
            itself that aren&rsquo;t tied to one service.
          </li>
          <li>
            <strong>Protection to persons and property:</strong> fire services,
            animal control and building inspection.
          </li>
          <li>
            <strong>Transportation services:</strong> building and maintaining
            roads, including snow removal, patching and sidewalk repairs.
          </li>
          <li>
            <strong>Environmental services:</strong> stormwater management,
            litter pickup and monitoring a closed landfill site.
          </li>
          <li>
            <strong>Health, social and family services:</strong> services for
            seniors.
          </li>
          <li>
            <strong>Recreation and culture services:</strong> recreation
            programs, facilities, parks and library services.
          </li>
          <li>
            <strong>Planning and development:</strong> municipal planning and
            review of development applications.
          </li>
        </ul>
        <p>
          <strong>Difference</strong> is actual minus budget. A plus means the
          Town spent more than budgeted.
        </p>
      </InfoHeading>
      <Table rows={expense} firstCol="Service area" />

      <InfoHeading title="Where the money came from" label="revenue sources">
        <ul className="help-list">
          {revenue
            .filter((r) => REVENUE_HELP[r.category])
            .map((r) => (
              <li key={r.category}>
                <strong>{r.category}:</strong> {REVENUE_HELP[r.category]}.
              </li>
            ))}
        </ul>
        <p>
          <strong>Difference</strong> is actual minus budget. A plus means the
          Town received more than budgeted.
        </p>
      </InfoHeading>
      <Table rows={revenue} firstCol="Source" />
    </>
  );
}
