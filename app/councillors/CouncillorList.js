"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ALL = "all";

function seatLabel(seat) {
  return [seat.role, seat.ward].filter(Boolean).join(" · ");
}

export default function CouncillorList({ terms, councillors }) {
  // Default to the most recent term.
  const [term, setTerm] = useState(terms[0]?.id ?? ALL);

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

  // Within one term, list the mayor and regional councillors first.
  const rank = (c) => {
    const role = (c.seats.find((s) => s.term_id === term)?.role ?? "").toLowerCase();
    if (role.includes("mayor")) return 0;
    if (role.includes("regional")) return 1;
    return 2;
  };
  const sorted =
    term === ALL ? shown : [...shown].sort((a, b) => rank(a) - rank(b));

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
