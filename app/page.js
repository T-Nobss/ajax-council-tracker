import Link from "next/link";

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

export default function Home() {
  return (
    <>
      <h1>Ajax Town Council, on the record</h1>
      <p className="lead">
        Voting records, expenses and budgets for Ajax Town Council, from public
        records.
      </p>
      <p>
        This site gathers information the Town of Ajax already publishes —
        council minutes, recorded votes and expense reports — and puts it in one
        place so residents can see what their council is doing. Every record
        links back to its original source.
      </p>

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
