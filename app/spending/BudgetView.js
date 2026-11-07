"use client";

import { useEffect, useState } from "react";
import ActualView from "./ActualView";
import DocumentsView from "./DocumentsView";
import PlannedView from "./PlannedView";

const TABS = [
  { id: "planned", label: "Planned" },
  { id: "actual", label: "Actual" },
  { id: "documents", label: "Documents" },
];

// Year picker + tabs. Both are kept in the address (?year=2025&tab=actual)
// so a link opens the same view.
export default function BudgetView({ years, byYear }) {
  const [year, setYear] = useState(years[0]);
  const [tab, setTab] = useState("planned");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const y = q.get("year");
    const t = q.get("tab");
    if (y && years.includes(y)) setYear(y);
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [years]);

  function update(nextYear, nextTab) {
    setYear(nextYear);
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("year", nextYear);
    url.searchParams.set("tab", nextTab);
    window.history.replaceState(null, "", url);
  }

  // Arrow keys move between tabs, as screen-reader users expect.
  function onTabKey(e) {
    const i = TABS.findIndex((x) => x.id === tab);
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = TABS[(i + dir + TABS.length) % TABS.length];
    update(year, next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  const d = byYear[year];

  return (
    <>
      <div className="filter">
        <label htmlFor="year">Year</label>
        <select id="year" value={year} onChange={(e) => update(e.target.value, tab)}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="tabs" role="tablist" aria-label="Spending views" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="budget-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => update(year, t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="budget-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tab-panel">
        {tab === "planned" &&
          (d.operating.length || d.capital.length ? (
            <PlannedView key={year} year={year} d={d} />
          ) : (
            <div className="notice">No budget figures have been added for {year}.</div>
          ))}
        {tab === "actual" && <ActualView key={year} year={year} actuals={d.actuals} />}
        {tab === "documents" && (
          <DocumentsView key={year} year={year} docs={d.documents} adoption={d.adoption} />
        )}
      </div>
    </>
  );
}
