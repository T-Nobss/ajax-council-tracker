"use client";

import { useId, useRef, useState } from "react";

// Salary heading + table with two sources side by side. The notes stay
// hidden behind an "i" button (and a "?" on each "Under $100k" cell).
export default function SalarySection({ rows, notes }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef(null);

  function show() {
    setOpen(true);
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  }

  return (
    <>
      <div className="heading-row">
        <h2>Salary</h2>
        <button
          type="button"
          className="info-btn"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Hide notes about salary" : "About these salary figures"}
          onClick={() => setOpen((o) => !o)}
        >
          i
        </button>
      </div>

      <div id={panelId} ref={panelRef} className="info-panel" hidden={!open}>
        <button type="button" className="info-close" aria-label="Close notes" onClick={() => setOpen(false)}>
          ×
        </button>
        {notes}
      </div>

      <div className="table-wrap">
        <table className="data-table pay-table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col" className="num">Town report</th>
              <th scope="col" className="num">Sunshine List</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row">{r.year}</th>
                <td className="num">
                  {r.town ? (
                    <>
                      {r.town.amount}
                      {r.town.severance && <span className="pay-sub">incl. severance</span>}
                    </>
                  ) : (
                    <span className="pay-none">—</span>
                  )}
                </td>
                <td className="num">
                  {r.sunshine?.listed ? (
                    <>
                      {r.sunshine.salary}
                      <span className="pay-sub">+ {r.sunshine.benefits} benefits</span>
                    </>
                  ) : r.sunshine ? (
                    <span className="not-listed">
                      Under $100k
                      <button
                        type="button"
                        className="info-btn info-btn-small"
                        aria-controls={panelId}
                        aria-label="Why does it say under $100k?"
                        onClick={show}
                      >
                        ?
                      </button>
                    </span>
                  ) : (
                    <span className="pay-none">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
