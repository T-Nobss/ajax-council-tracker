"use client";

import { Children, useState } from "react";

// Shows the first `initial` items of a list, then reveals `step` more per click.
export default function ShowMore({ initial = 5, step = 10, className, label = "items", children }) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(initial);
  const left = items.length - shown;
  return (
    <>
      <ul className={className}>{items.slice(0, shown)}</ul>
      {items.length > initial && (
        <div className="show-more-row">
          {left > 0 && (
            <button type="button" className="show-more" onClick={() => setShown((s) => s + step)}>
              See more ({left} more {label})
            </button>
          )}
          {shown > initial && (
            <button type="button" className="show-more show-less" onClick={() => setShown(initial)}>
              Show fewer
            </button>
          )}
        </div>
      )}
    </>
  );
}
