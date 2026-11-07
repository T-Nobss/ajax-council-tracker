"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ALL = "all";

function seatLabel(seat) {
  return [seat.role, seat.ward].filter(Boolean).join(" · ");
}

// The term in office on a given day (YYYY-MM-DD). Before any term has
// started, or between terms, fall back to the most recent one that started.
function termInOffice(terms, today) {
  const current = terms.find((t) => t.start_date <= today && today <= t.end_date);
  if (current) return current.id;
  const started = terms.find((t) => t.start_date <= today); // newest first
  return (started ?? terms[0])?.id ?? ALL;
}

const localToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function CouncillorList({ terms, councillors, buildDate }) {
  // "Today" starts as the build date (so the server HTML matches) and is
  // corrected to the visitor's date once the page loads, because the site
  // isn't rebuilt every day.
  const [today, setToday] = useState(buildDate);
  const [term, setTerm] = useState(() => termInOffice(terms, buildDate));

  // Respect ?term=... in the address so filtered views can be shared;
  // otherwise show the council in office today.
  useEffect(() => {
    const now = localToday();
    setToday(now);
    const fromUrl = new URLSearchParams(window.location.search).get("term");
    if (fromUrl && (fromUrl === ALL || terms.some((t) => t.id === fromUrl))) {
      setTerm(fromUrl);
    } else {
      setTerm(termInOffice(terms, now));
    }
  }, [terms]);

  const termLabel = (t) => {
    if (t.start_date > today) return `${t.name} (incoming)`;
    if (t.start_date <= today && today <= t.end_date) return `${t.name} (current)`;
    return t.name;
  };

  function changeTerm(value) {
    setTerm(value);
    const url = new URL(window.location.href);
    url.searchParams.set("term", value);
    window.history.replaceState(null, "", url);
  }

  const shown =
    term === ALL
      ? councillors
      : councillors.filter((c) => c.seats.some((s) => s.term_id === term));

  // Within one term: mayor, then regional councillors, then councillors,
  // each group in ward order.
  const seatIn = (c) => c.seats.find((s) => s.term_id === term);
  const rank = (c) => {
    const role = (seatIn(c)?.role ?? "").toLowerCase();
    if (role.includes("mayor")) return 0;
    if (role.includes("regional")) return 1;
    return 2;
  };
  const ward = (c) => seatIn(c)?.ward ?? "";
  const sorted =
    term === ALL
      ? shown
      : [...shown].sort(
          (a, b) =>
            rank(a) - rank(b) ||
            ward(a).localeCompare(ward(b), undefined, { numeric: true })
        );

  return (
    <>
      {terms.length > 0 && (
        <div className="filter">
          <label htmlFor="term">Term of council</label>
          <select
            id="term"
            value={term}
            onChange={(e) => changeTerm(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {termLabel(t)}
              </option>
            ))}
            <option value={ALL}>All terms</option>
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="notice">No councillors have been added yet.</div>
      ) : (
        <ul className="people">
          {sorted.map((c) => {
            const seats =
              term === ALL ? c.seats : c.seats.filter((s) => s.term_id === term);
            return (
              <li key={c.id}>
                <Link href={`/councillors/${c.id}`} className="person">
                  <strong>{c.name}</strong>
                  {seats.map((s, i) => (
                    <span key={i}>
                      {term === ALL && `${s.term_name}: `}
                      {seatLabel(s)}
                    </span>
                  ))}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
