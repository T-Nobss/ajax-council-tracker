"use client";

import { useEffect, useState } from "react";
import InfoHeading from "../components/InfoHeading";

const fmtFull = (n) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return fmtFull(n);
}

// Full amount on wide screens, "$26.8M" style on phones.
function Money({ value }) {
  return (
    <>
      <span className="m-full">{fmtFull(value)}</span>
      <span className="m-short">{fmtShort(value)}</span>
    </>
  );
}

const pdfPage = (url, page) => `${url}#page=${String(page).split("-")[0]}`;

const PREVIEW = 10;

export default function BudgetView({ years, byYear }) {
  const [year, setYear] = useState(years[0]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("year");
    if (fromUrl && years.includes(fromUrl)) setYear(fromUrl);
  }, [years]);

  function changeYear(value) {
    setYear(value);
    const url = new URL(window.location.href);
    url.searchParams.set("year", value);
    window.history.replaceState(null, "", url);
  }

  const d = byYear[year];
  const total = d.operating.reduce(
    (t, r) => ({ gross: t.gross + r.gross, revenue: t.revenue + r.revenue, net: t.net + r.net }),
    { gross: 0, revenue: 0, net: 0 }
  );
  const capitalTotal = d.capital.reduce((t, p) => t + p.cost, 0);
  const rc = d.reconciliation;

  return (
    <>
      <div className="filter">
        <label htmlFor="year">Budget year</label>
        <select id="year" value={year} onChange={(e) => changeYear(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* ---------------- Operating budget ---------------- */}
      <InfoHeading title="Operating budget" label="the operating budget">
        <p>
          The operating budget pays for the Town&rsquo;s day-to-day services:
          staff, programs, maintenance, utilities and so on.
        </p>
        <p>
          <strong>Spending</strong> is each department&rsquo;s total cost.{" "}
          <strong>Revenue</strong> is what it brings in from fees, grants and
          recoveries. <strong>Net</strong> is the difference, which is paid for
          by property tax.
        </p>
        {rc && (
          <>
            <p>
              <strong>Why these totals don&rsquo;t match the Town&rsquo;s total
              page.</strong> Adding up the departments gives{" "}
              {fmtFull(rc.departments_spending - rc.town_spending)} more spending
              and {fmtFull(rc.departments_revenue - rc.town_revenue)} more revenue
              than the budget book&rsquo;s town-wide page (page {rc.town_page}).
              The net amount paid by property tax is the same. The difference
              comes from how that page presents a few items, not from missing
              numbers:
            </p>
            <ol>
              <li>
                It counts the Library as one grant equal to its net cost, so the
                Library&rsquo;s own revenue ({fmtFull(rc.library_revenue)}) is
                left out of both spending and revenue.
              </li>
              <li>
                It lists the Library&rsquo;s loan payment, and the reserve money
                that pays for it ({fmtFull(rc.library_debt)}), as separate lines
                as well.
              </li>
              <li>
                It includes {fmtFull(rc.other_costs)} of costs, such as utilities
                and contracted services, that aren&rsquo;t on any department page.
                They&rsquo;re matched by {fmtFull(rc.other_recoveries)} paid back
                to the Town
                {rc.other_recoveries !== rc.other_costs && " (the small difference looks like rounding)"}
                . The budget book doesn&rsquo;t say what these costs are for.
              </li>
            </ol>
          </>
        )}
        <p>
          Department names change over the years as the Town reorganizes, so a
          department&rsquo;s numbers can jump between years for that reason
          alone.
        </p>
        {d.operatingSource && (
          <p>
            Source:{" "}
            <a href={d.operatingSource} target="_blank" rel="noopener noreferrer">
              {year} Operating Budget (amended)
            </a>
            , Town of Ajax.
          </p>
        )}
      </InfoHeading>

      <div className="table-wrap">
        <table className="data-table budget-table">
          <thead>
            <tr>
              <th scope="col">Department</th>
              <th scope="col" className="num">Spending</th>
              <th scope="col" className="num">Revenue</th>
              <th scope="col" className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {d.operating.map((r) => (
              <tr key={r.department}>
                <th scope="row">
                  <a
                    href={pdfPage(d.operatingSource, r.page)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-link"
                    title={`Page ${r.page} of the budget book`}
                  >
                    {r.department}
                  </a>
                </th>
                <td className="num"><Money value={r.gross} /></td>
                <td className="num"><Money value={r.revenue} /></td>
                <td className="num"><Money value={r.net} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num"><Money value={total.gross} /></td>
              <td className="num"><Money value={total.revenue} /></td>
              <td className="num"><Money value={total.net} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="table-hint">Tap a department to see its page in the budget book.</p>

      {/* ---------------- Capital budget ---------------- */}
      <InfoHeading title="Capital projects" label="capital projects">
        <p>
          The capital budget pays for one-time projects such as roads, bridges,
          buildings, parks, vehicles and equipment, and studies about them.
        </p>
        <p>
          This list shows only the projects with money in the {year} budget,
          not the Town&rsquo;s 10-year forecast. Together they add up to the{" "}
          {year} capital total published in the budget book.
        </p>
        <p>
          <strong>Funding</strong> shows where the money comes from, such as
          Town reserves, development charges (fees paid by developers for
          growth) or government grants. Some smaller projects are part of a
          larger program, so only their type of funding is shown.
        </p>
        {d.capitalSource && (
          <p>
            Source:{" "}
            <a href={d.capitalSource} target="_blank" rel="noopener noreferrer">
              {year} Capital Budget (amended)
            </a>
            , Town of Ajax.
          </p>
        )}
      </InfoHeading>

      <p className="capital-total">
        <strong>{fmtFull(capitalTotal)}</strong> across {d.capital.length}{" "}
        projects
      </p>

      <ProjectList key={year} projects={d.capital} source={d.capitalSource} />
    </>
  );
}

function ProjectList({ projects, source }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? projects : projects.slice(0, PREVIEW);

  return (
    <>
      <ul className="projects">
        {shown.map((p) => (
          <li key={p.number + p.name}>
            <div className="project-main">
              <a
                href={pdfPage(source, p.page)}
                target="_blank"
                rel="noopener noreferrer"
                className="project-name"
                title={`Page ${p.page} of the budget book`}
              >
                {p.name}
              </a>
              <span className="project-cost">{fmtFull(p.cost)}</span>
            </div>
            <div className="project-meta">
              {[p.department, p.funding && `Funding: ${p.funding}`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </li>
        ))}
      </ul>
      {projects.length > PREVIEW && (
        <button type="button" className="show-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer" : `Show all ${projects.length} projects`}
        </button>
      )}
    </>
  );
}
