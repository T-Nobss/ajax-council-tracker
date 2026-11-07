import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  formatMoney,
  getCouncillorWithSeats,
  getCouncillors,
  getSalaryHistory,
} from "@/lib/data";
import SalarySection from "./SalarySection";

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
  // Durham pay note: based on the roles held during the salary years shown,
  // not later ones (e.g. someone elected Mayor after serving as a
  // Regional Councillor).
  const salaryYears = new Set(salaries.map((s) => s.year));
  const rolesInSalaryYears = c.seats
    .filter((seat) => {
      if (!seat.term) return false;
      const from = Number(seat.term.start_date.slice(0, 4));
      const to = Number(seat.term.end_date.slice(0, 4));
      return [...salaryYears].some((y) => y >= from && y <= to);
    })
    .map((seat) => seat.role);
  const regionalRoles = [
    rolesInSalaryYears.some((r) => /mayor/i.test(r)) && "Mayor",
    rolesInSalaryYears.some((r) => /regional/i.test(r)) && "a Regional Councillor",
  ].filter(Boolean);
  const sitsOnRegion = regionalRoles.length > 0;

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

      {salaries.length === 0 ? (
        <>
          <h2>Salary</h2>
          <div className="notice">No salary records yet.</div>
        </>
      ) : (
        <SalarySection
          rows={salaries.map((s) => ({
            year: s.year,
            listed: s.listed,
            salary: s.listed ? formatMoney(s.salary) : "",
            benefits: s.listed ? formatMoney(s.benefits) : "",
          }))}
          notes={
            <>
              <p>
                Pay from the Town of Ajax, from Ontario&rsquo;s Public Sector
                Salary Disclosure (the &ldquo;Sunshine List&rdquo;).
              </p>
              {anyNotListed && (
                <p>
                  <strong>Not listed</strong> means {c.name} was paid less than
                  $100,000 by the Town of Ajax that year. It doesn&rsquo;t mean
                  they were paid nothing. The Sunshine List only includes people
                  paid $100,000 or more.
                </p>
              )}
              {sitsOnRegion && (
                <p>
                  As {regionalRoles.join(" and as ")}, {c.name} was
                  also paid separately by the Region of Durham for sitting on
                  Regional Council. That pay isn&rsquo;t included here.
                </p>
              )}
              <p>
                Each year&rsquo;s list is published the following spring.
                Source:{" "}
                {listed.length > 0 ? (
                  <>
                    Sunshine List{" "}
                    {listed.map((s, i) => (
                      <span key={s.year}>
                        {i > 0 && ", "}
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer">
                          {s.year}
                        </a>
                      </span>
                    ))}
                  </>
                ) : (
                  <a
                    href="https://www.ontario.ca/page/public-sector-salary-disclosure"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sunshine List
                  </a>
                )}
                .
              </p>
            </>
          }
        />
      )}

      <h2>Votes</h2>
      <div className="notice">Voting records will appear here.</div>

      <h2>Expenses</h2>
      <div className="notice">Expense records will appear here.</div>
    </>
  );
}
