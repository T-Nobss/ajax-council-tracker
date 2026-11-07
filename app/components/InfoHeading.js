"use client";

import { useId, useState } from "react";

// A section heading with an "i" button that shows or hides notes.
// Same look as the Salary notes on councillor profiles.
export default function InfoHeading({ title, label, children, level = 2 }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const H = `h${level}`;

  return (
    <>
      <div className="heading-row">
        <H>{title}</H>
        <button
          type="button"
          className="info-btn"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Hide notes about ${label}` : `About ${label}`}
          onClick={() => setOpen((o) => !o)}
        >
          i
        </button>
      </div>
      <div id={panelId} className="info-panel" hidden={!open}>
        <button
          type="button"
          className="info-close"
          aria-label="Close notes"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        {children}
      </div>
    </>
  );
}
