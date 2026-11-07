"use client";

import { useId, useRef, useState } from "react";

// Salary heading + table. The explanatory notes stay hidden behind an
// "i" button next to the heading (and a "?" on each "Not listed" row).
export default function SalarySection({ rows, notes }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef(null);

  function show() {
    setOpen(true);
    // Bring the notes into view when opened from a row further down.
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

      <div
        id={panelId}
        ref={panelRef}
        className="info-panel"
        hidden={!open}
      >
        <button
          type="button"
          className="info-close"
          aria-label="Close notes"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        {notes}
      </div>

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
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row">{r.year}</th>
                {r.listed ? (
                  <>
                    <td className="num">{r.salary}</td>
                    <td className="num">{r.benefits}</td>
                  </>
                ) : (
                  <td colSpan={2} className="not-listed">
                    Not listed
                    <button
                      type="button"
                      className="info-btn info-btn-small"
                      aria-controls={panelId}
                      aria-label="What does “Not listed” mean?"
                      onClick={show}
                    >
                      ?
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
