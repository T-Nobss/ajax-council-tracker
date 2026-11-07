import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  formatMoney,
  getCouncillorWithSeats,
  getCouncillors,
  getSalaryHistory,
} from "@/lib/data";

// One page per row in councillors.csv, built ahead of time.
// The address uses the councillor's id, e.g. /councillors/jane-smith
export const dynamicParams = false;

export function generateStaticParams() {
  return getCouncillors().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = getCouncillorWithSeats(id);
  return { title: c ? c.name : "Councillor not found" };
}

export default async function CouncillorPage({ params }) {
  const { id } = await params;
  const c = getCouncillorWithSeats(id);
  if (!c) notFound();
  const salaries = getSalaryHistory(c.id);
  const anyNotListed = salaries.some((s) => !s.listed);
  const listed = salaries.filter((s) => s.listed);
  const sitsOnRegion = c.seats.some((s) => /mayor|regional/i.test(s.role));

  return (
    <>
      <Link href="/councillors" className="crumb">
        ← All councillors
      </Link>
      <h1>{c.name}</h1>

      <h2>Seats held</h2>
      {c.seats.length === 0 ? (
        <div className="notice">No seats recorded yet.</div>
      ) : (
        <ul className="seats">
          {c.seats.map((s, i) => (
            <li key={i}>
              <strong>{s.term?.name ?? s.term_id}</strong>
              <span>{[s.role, s.ward].filter(Boolean).join(" · ")}</span>
              {s.term && (
                <span className="dates">
                  {formatDate(s.term.start_date)} – {formatDate(s.term.end_date)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2>Salary</h2>
      {salaries.length === 0 ? (
        <div className="notice">No salary records yet.</div>
      ) : (
        <>
          <p className="section-intro">
            Pay from the Town of Ajax, from Ontario&rsquo;s Public Sector Salary
            Disclosure (the &ldquo;Sunshine List&rdquo;).
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col" className="num">Salary</th>
                  <th scope="col" className="num">Taxable benefits</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.year}>
                    <th scope="row">{s.year}</th>
                    {s.listed ? (
                      <>
                        <td className="num">{formatMoney(s.salary)}</td>
                        <td className="num">{formatMoney(s.benefits)}</td>
                      </>
                    ) : (
                      <td colSpan={2} className="not-listed">
                        Not listed{" "}
                        <span aria-hidden="true">*</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="footnote">
            {anyNotListed && (
              <p>
                <strong>* Not listed</strong> means {c.name} was paid less than
                $100,000 by the Town of Ajax that year. It doesn&rsquo;t mean
                they were paid nothing. The Sunshine List only includes people
                paid $100,000 or more.
              </p>
            )}
            {sitsOnRegion && (
              <p>
                As {c.seats.some((s) => /mayor/i.test(s.role)) ? "Mayor" : "a Regional Councillor"},{" "}
                {c.name} is also paid separately by the Region of Durham for
                sitting on Regional Council. That pay isn&rsquo;t included here.
              </p>
            )}
            <p>
              Each year&rsquo;s list is published the following spring.
              {listed.length > 0 && (
                <>
                  {" "}Source: Sunshine List{" "}
                  {listed.map((s, i) => (
                    <span key={s.year}>
                      {i > 0 && ", "}
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer">
                        {s.year}
                      </a>
                    </span>
                  ))}
                  .
                </>
              )}
              {listed.length === 0 && (
                <>
                  {" "}Source:{" "}
                  <a
                    href="https://www.ontario.ca/page/public-sector-salary-disclosure"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sunshine List
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </>
      )}

      <h2>Votes</h2>
      <div className="notice">Voting records will appear here.</div>

      <h2>Expenses</h2>
      <div className="notice">Expense records will appear here.</div>
    </>
  );
}
