import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  getCouncillorWithSeats,
  getCouncillors,
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

      <h2>Votes</h2>
      <div className="notice">Voting records will appear here.</div>

      <h2>Expenses</h2>
      <div className="notice">Expense records will appear here.</div>
    </>
  );
}
