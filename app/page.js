import Link from "next/link";
import Avatar from "./components/Avatar";
import PageHero from "./components/PageHero";
import { getCouncillorsWithSeats, getTermsSorted } from "@/lib/data";

const sections = [
  {
    href: "/councillors",
    title: "Councillors",
    blurb: "Who sits on council, by term and ward, with each member's pay and expenses.",
  },
  {
    href: "/votes",
    title: "Votes",
    blurb: "Motions brought to council and how each member voted.",
  },
  {
    href: "/spending",
    title: "Spending",
    blurb: "What the Town planned to spend, what it actually spent, and the budget documents.",
  },
];

// Mayor first, then Regional Councillors, then Local Councillors, by ward.
const rank = (role) => (/mayor/i.test(role) ? 0 : /regional/i.test(role) ? 1 : 2);

export default function Home() {
  // The newest term that has members (same rule as the Councillors page).
  const people = getCouncillorsWithSeats();
  const term = getTermsSorted().find((t) => people.some((c) => c.seats.some((s) => s.term_id === t.id)));
  const council = term
    ? people
        .map((c) => ({ ...c, seat: c.seats.find((s) => s.term_id === term.id) }))
        .filter((c) => c.seat)
        .sort((a, b) => rank(a.seat.role) - rank(b.seat.role) ||
          (a.seat.ward || "").localeCompare(b.seat.ward || "", undefined, { numeric: true }))
    : [];

  return (
    <>
      <PageHero
        size="home"
        photo="photos/waterfront.jpg"
        alt="Aerial view of the Ajax waterfront: Lake Ontario, the shoreline trail and parkland"
        title="Ajax Town Council, on the record"
        lead="Voting records, pay, expenses and budgets for Ajax Town Council, from public records."
        focus="center 40%"
      >
        <div className="hero-actions">
          <Link href="/councillors" className="btn btn-primary">
            Meet your council
          </Link>
          <Link href="/spending" className="btn btn-ghost">
            See the spending
          </Link>
        </div>
      </PageHero>

      <p className="intro">
        This site gathers information the Town of Ajax already publishes
        (council minutes, recorded votes, expense reports and budgets) and puts
        it in one place so residents can see what their council is doing. Every
        figure links back to its original source.
      </p>

      {council.length > 0 && (
        <section className="council-strip" aria-labelledby="council-heading">
          <h2 id="council-heading">Your council, {term.name}</h2>
          <ul>
            {council.map((c) => (
              <li key={c.id}>
                <Link href={`/councillors/${c.id}`}>
                  <Avatar id={c.id} name={c.name} size={76} />
                  <strong>{c.name}</strong>
                  <span>{[c.seat.role, c.seat.ward].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2>Explore</h2>
      <ul className="cards">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="card">
              <strong>{s.title}</strong>
              <span>{s.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
