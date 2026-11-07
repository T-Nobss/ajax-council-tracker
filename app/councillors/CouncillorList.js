"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ALL = "all";

function seatLabel(seat) {
  return [seat.role, seat.ward].filter(Boolean).join(" · ");
}

export default function CouncillorList({ terms, councillors }) {
  // Default to the newest term that has members in seats.csv (terms arrive
  // newest first). Adding a new council's seats makes it the default
  // automatically; a term added without members yet is skipped.
  const newestWithMembers = terms.find((t) =>
    councillors.some((c) => c.seats.some((s) => s.term_id === t.id))
  );
  const [term, setTerm] = useState(newestWithMembers?.id ?? terms[0]?.id ?? ALL);

  // Respect ?term=... in the address so filtered views can be shared.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("term");
    if (fromUrl && (fromUrl === ALL || terms.some((t) => t.id === fromUrl))) {
      setTerm(fromUrl);
    }
  }, [terms]);

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
                {t.name}
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
