import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  formatMoney,
  getCouncillorWithSeats,
  getCouncillors,
  getExpenses,
  getCouncillorPhotos,
  getPayHistory,
} from "@/lib/data";
import ExpensesSection from "./ExpensesSection";
import Avatar from "../../components/Avatar";
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
  const photo = getCouncillorPhotos()[c.id];
  const pay = getPayHistory(c.id);
  const sunshineListed = pay.filter((p) => p.sunshine?.listed);
  const anyUnder = pay.some((p) => p.sunshine && !p.sunshine.listed);
  const townYears = pay.filter((p) => p.town);
  // Mayor / Regional Councillor in any year shown: their Region of Durham
  // pay is handled through the Town (see the harmonization note).
  const payYears = new Set(pay.map((p) => p.year));
  const rolesInPayYears = c.seats
    .filter((seat) => {
      if (!seat.term) return false;
      const from = Number(seat.term.start_date.slice(0, 4));
      const to = Number(seat.term.end_date.slice(0, 4));
      return [...payYears].some((y) => y >= from && y <= to);
    })
    .map((seat) => seat.role);
  const sitsOnRegion = rolesInPayYears.some((r) => /mayor|regional/i.test(r));
  const HARMONIZATION_URL =
    "https://ajax.cityconnections.civicflow.co/p/town-of-ajax/documents/meeting/598?f=0#page=75";

  // Expenses by year, newest first.
  const expenseYears = Object.values(
    getExpenses()
      .filter((e) => e.councillor_id === c.id)
      .reduce((acc, e) => {
        const y = (acc[e.year] ??= { year: e.year, source: e.source_url, items: [] });
        y.items.push({ category: e.category, amount: Number(e.amount) || 0 });
        return acc;
      }, {})
  ).sort((a, b) => b.year.localeCompare(a.year));

  return (
    <>
      <Link href="/councillors" className="crumb">
        ← All councillors
      </Link>
      <div className="profile-head">
        <Avatar id={c.id} name={c.name} size={112} shape="portrait" />
        <div>
          <h1>{c.name}</h1>
          {c.seats[0] && (
            <p className="profile-role">
              {[c.seats[0].role, c.seats[0].ward].filter(Boolean).join(" · ")}
              <span>{c.seats[0].term?.name ?? c.seats[0].term_id} term</span>
            </p>
          )}
          {photo && (
            <p className="profile-credit">
              Photo:{" "}
              <a href={photo.source_url} target="_blank" rel="noopener noreferrer">
                {photo.credit}
              </a>
            </p>
          )}
        </div>
      </div>

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

      {pay.length === 0 ? (
        <>
          <h2>Salary</h2>
          <div className="notice">No salary records yet.</div>
        </>
      ) : (
        <SalarySection
          rows={pay.map((p) => ({
            year: p.year,
            town: p.town ? { amount: formatMoney(p.town.amount), severance: p.town.severance } : null,
            sunshine: p.sunshine
              ? {
                  listed: p.sunshine.listed,
                  salary: p.sunshine.listed ? formatMoney(p.sunshine.salary) : "",
                  benefits: p.sunshine.listed ? formatMoney(p.sunshine.benefits) : "",
                }
              : null,
          }))}
          notes={
            <>
              <p>
                {c.name}&rsquo;s pay from two public reports. They measure pay
                differently, so the numbers don&rsquo;t match each other.
              </p>
              <ul className="help-list">
                <li>
                  <strong>Town report:</strong> &ldquo;remuneration and
                  benefits&rdquo; from the Town&rsquo;s yearly Statement of
                  Remuneration and Expenses, which covers every member of
                  Council. It includes the Town&rsquo;s cost of benefits.
                  {townYears.length > 0 && (
                    <>
                      {" "}Reports:{" "}
                      {townYears.map((p, i) => (
                        <span key={p.year}>
                          {i > 0 && ", "}
                          <a href={p.town.source_url} target="_blank" rel="noopener noreferrer">
                            {p.year}
                          </a>
                        </span>
                      ))}
                      .
                    </>
                  )}
                </li>
                <li>
                  <strong>Sunshine List:</strong> salary and taxable benefits
                  as reported to the Province, for people paid $100,000 or
                  more.
                  {sunshineListed.length > 0 && (
                    <>
                      {" "}Lists:{" "}
                      {sunshineListed.map((p, i) => (
                        <span key={p.year}>
                          {i > 0 && ", "}
                          <a href={p.sunshine.source_url} target="_blank" rel="noopener noreferrer">
                            {p.year}
                          </a>
                        </span>
                      ))}
                      .
                    </>
                  )}
                </li>
              </ul>
              {anyUnder && (
                <p>
                  <strong>Under $100k</strong> means {c.name} isn&rsquo;t on that
                  year&rsquo;s Sunshine List because the Town paid them less than
                  $100,000. Their pay is in the Town report column.
                </p>
              )}
              {sitsOnRegion && (
                <p>
                  <strong>Region of Durham pay.</strong> The Mayor and Regional
                  Councillors are also paid by the Region for sitting on
                  Regional Council. In{" "}
                  <a href={HARMONIZATION_URL} target="_blank" rel="noopener noreferrer">
                    December 2022
                  </a>{" "}
                  Council agreed that the Town would pay that too and be paid
                  back by the Region. The Sunshine List amounts for these roles
                  rise sharply from 2024, so from then on they likely include
                  the Region&rsquo;s share. The Town report covers Town pay only.
                </p>
              )}
              <p>
                A dash (&mdash;) means that report wasn&rsquo;t collected for
                that year. Each year&rsquo;s reports come out the following
                spring. Expenses and allowances are shown separately below.
              </p>
            </>
          }
        />
      )}

      <ExpensesSection name={c.name} years={expenseYears} />

      <h2>Votes</h2>
      <div className="notice">Voting records will appear here.</div>
    </>
  );
}
