"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InfoHeading from "../components/InfoHeading";

const PAGE = 30;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const TYPES = [
  ["all", "All meetings"],
  ["Council", "Council"],
  ["General Government Committee", "General Government Committee"],
  ["Special", "Special meetings"],
];
const RESULTS = [
  ["all", "Any result"],
  ["carried", "Carried"],
  ["lost", "Lost or defeated"],
];

// Filter defaults. Anything else is written to the address bar.
const DEFAULTS = { tab: "recorded", year: "all", month: "all", type: "all", result: "all", member: "", q: "", split: "1" };

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

function typeMatches(type, filter) {
  if (filter === "all") return true;
  if (filter === "Special") return /^Special/.test(type);
  return type === filter;
}

export function Outcome({ outcome }) {
  return <span className={`outcome outcome-${outcome.kind}`}>{outcome.label}</span>;
}

function VoteCard({ m, member }) {
  const theirVote = member ? (m.yesIds.includes(member) ? "For" : m.noIds.includes(member) ? "Against" : null) : null;
  return (
    <li className="vote-card">
      <div className="vote-meta">
        <Link href={`/votes/${m.meetingId}#${m.id}`}>
          {formatDate(m.date)} · {m.type}
        </Link>
        <Outcome outcome={m.outcome} />
      </div>
      <p className="vote-item">{m.item}</p>
      <p className="vote-text">{m.text}</p>
      <div className="tally">
        <span className="tally-score">
          {m.yes.length}–{m.no.length}
        </span>
        <span className="tally-side tally-yes">
          <strong>For:</strong> {m.yes.join(", ") || "none"}
        </span>
        <span className="tally-side tally-no">
          <strong>Against:</strong> {m.no.join(", ") || "none"}
        </span>
      </div>
      {theirVote && (
        <p className={`their-vote mv-${theirVote.toLowerCase()}`}>Voted {theirVote.toLowerCase()}</p>
      )}
    </li>
  );
}

function Select({ id, label, value, onChange, options, disabled }) {
  return (
    <div className="f-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function VotesView({ terms, recorded, meetings, members }) {
  const [f, setF] = useState({ ...DEFAULTS, term: terms[0]?.id ?? "all" });
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(true); // filter panel; folded on phones

  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);

  // Read filters from the address so links open the same view.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const next = {};
    for (const k of [...Object.keys(DEFAULTS), "term"]) if (p.has(k)) next[k] = p.get(k);
    if (next.term && next.term !== "all" && !terms.some((t) => t.id === next.term)) delete next.term;
    if (Object.keys(next).length) setF((cur) => ({ ...cur, ...next }));
  }, [terms]);

  function set(changes) {
    setF((cur) => {
      const next = { ...cur, ...changes };
      // Picking a new term or year resets the narrower date filters.
      if ("term" in changes) Object.assign(next, { year: "all", month: "all" });
      if ("year" in changes) next.month = "all";
      const url = new URL(window.location.href);
      for (const [k, v] of Object.entries(next)) {
        const def = k === "term" ? terms[0]?.id : DEFAULTS[k];
        if (v === def || v === "") url.searchParams.delete(k);
        else url.searchParams.set(k, v);
      }
      window.history.replaceState(null, "", url);
      return next;
    });
    setShown(PAGE);
  }
  const clearAll = () => set({ ...DEFAULTS, tab: f.tab, term: terms[0]?.id ?? "all", split: f.tab === "recorded" ? "0" : "1" });

  // Date options depend on what's in the selected term.
  const inTerm = (x) => f.term === "all" || x.term === f.term;
  const dated = f.tab === "recorded" ? recorded : meetings;
  const years = useMemo(
    () => [...new Set(dated.filter(inTerm).map((x) => x.date.slice(0, 4)))].sort().reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dated, f.term]
  );
  const months = useMemo(
    () =>
      f.year === "all"
        ? []
        : [...new Set(dated.filter((x) => inTerm(x) && x.date.startsWith(f.year)).map((x) => x.date.slice(5, 7)))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dated, f.term, f.year]
  );

  const query = f.q.trim().toLowerCase();
  const dateOk = (iso) => (f.year === "all" || iso.startsWith(f.year)) && (f.month === "all" || iso.slice(5, 7) === f.month);

  const votes = useMemo(
    () =>
      recorded.filter(
        (m) =>
          inTerm(m) &&
          dateOk(m.date) &&
          typeMatches(m.type, f.type) &&
          (f.result === "all" || m.outcome.kind === f.result) &&
          (f.split !== "1" || m.split) &&
          (!f.member || m.yesIds.includes(f.member) || m.noIds.includes(f.member)) &&
          (!query || `${m.item} ${m.text} ${m.yes.join(" ")} ${m.no.join(" ")}`.toLowerCase().includes(query))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recorded, f, query]
  );
  const meetingRows = meetings.filter((m) => inTerm(m) && dateOk(m.date) && typeMatches(m.type, f.type));

  // Active filter chips (each removable).
  const memberName = members.find((m) => m.id === f.member)?.name;
  const chips = [
    f.year !== "all" && ["year", f.month !== "all" ? `${MONTHS[Number(f.month) - 1]} ${f.year}` : f.year],
    f.type !== "all" && ["type", TYPES.find(([v]) => v === f.type)?.[1]],
    f.tab === "recorded" && f.result !== "all" && ["result", RESULTS.find(([v]) => v === f.result)?.[1]],
    f.tab === "recorded" && f.split === "1" && ["split", "Split votes only"],
    f.tab === "recorded" && f.member && ["member", memberName],
    f.tab === "recorded" && query && ["q", `“${f.q.trim()}”`],
  ].filter(Boolean);
  const removeChip = (key) =>
    set(key === "year" ? { year: "all" } : key === "split" ? { split: "0" } : { [key]: DEFAULTS[key] });

  // Group by month for display.
  function groups(rows) {
    const out = [];
    for (const r of rows) {
      const k = monthKey(r.date);
      if (!out.length || out[out.length - 1].key !== k) out.push({ key: k, rows: [] });
      out[out.length - 1].rows.push(r);
    }
    return out;
  }
  const visibleVotes = votes.slice(0, shown);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Votes views">
        {[
          ["recorded", "Recorded votes"],
          ["meetings", "Meetings"],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={f.tab === id}
            aria-controls="votes-panel"
            onClick={() => set({ tab: id })}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="filter-panel" aria-label="Filters">
        <button
          type="button"
          className="f-toggle"
          aria-expanded={open}
          aria-controls="f-grid"
          onClick={() => setOpen((o) => !o)}
        >
          <span>Filters</span>
          <span className="f-toggle-meta">
            {chips.filter(([k]) => k !== "q").length > 0 && `${chips.filter(([k]) => k !== "q").length} active · `}
            {open ? "Hide" : "Show"}
          </span>
        </button>
        <div className="f-grid" id="f-grid" hidden={!open}>
          <Select
            id="f-term"
            label="Term"
            value={f.term}
            onChange={(v) => set({ term: v })}
            options={[...terms.map((t) => [t.id, t.name]), ["all", "All terms"]]}
          />
          <Select
            id="f-year"
            label="Year"
            value={f.year}
            onChange={(v) => set({ year: v })}
            options={[["all", "All years"], ...years.map((y) => [y, y])]}
          />
          <Select
            id="f-month"
            label="Month"
            value={f.month}
            onChange={(v) => set({ month: v })}
            disabled={f.year === "all"}
            options={[["all", "All months"], ...months.map((mm) => [mm, MONTHS[Number(mm) - 1]])]}
          />
          <Select id="f-type" label="Meeting" value={f.type} onChange={(v) => set({ type: v })} options={TYPES} />
          {f.tab === "recorded" && (
            <>
              <Select id="f-result" label="Result" value={f.result} onChange={(v) => set({ result: v })} options={RESULTS} />
              <Select
                id="f-member"
                label="Member"
                value={f.member}
                onChange={(v) => set({ member: v })}
                options={[["", "Anyone"], ...members.map((m) => [m.id, m.name])]}
              />
            </>
          )}
        </div>
        {f.tab === "recorded" && (
          <div className="f-row">
            <input
              type="search"
              className="search"
              placeholder="Search motion text, items or names"
              aria-label="Search motion text, items or names"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
            />
            <label className="check">
              <input type="checkbox" checked={f.split === "1"} onChange={(e) => set({ split: e.target.checked ? "1" : "0" })} />
              Split votes only
            </label>
          </div>
        )}
        {chips.length > 0 && (
          <div className="chips" aria-label="Active filters">
            {chips.map(([key, label]) => (
              <button key={key} type="button" className="chip" onClick={() => removeChip(key)} aria-label={`Remove filter: ${label}`}>
                {label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="chip-clear" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </section>

      <div id="votes-panel" role="tabpanel" aria-labelledby={`tab-${f.tab}`} className="tab-panel">
        {f.tab === "recorded" ? (
          <>
            <InfoHeading title="Recorded votes" label="recorded votes">
              <p>
                Most motions pass without names being written down: the minutes
                just say CARRIED. A <strong>recorded vote</strong> is when the
                minutes list who voted for and against. Until 2024 that happened
                on fewer than 1 in 10 motions, usually because a member asked for
                it. From 2025 the minutes record names on most motions (about
                two-thirds in 2025 and nearly all in 2026).
              </p>
              <p>
                <strong>Split votes</strong> are the ones where members disagreed.
                Untick the box to include unanimous recorded votes too. Pick a{" "}
                <strong>member</strong> to see only votes they took part in, with
                how they voted.
              </p>
              <p>
                Names come from the official minutes. A few older minutes are
                scans, read with text recognition, so check the original minutes
                (linked on each meeting page) before quoting a vote.
              </p>
            </InfoHeading>
            <p className="result-count" aria-live="polite">
              {votes.length} {votes.length === 1 ? "vote" : "votes"}
              {votes.length > shown && `, showing the first ${shown}`}
            </p>
            {votes.length === 0 ? (
              <div className="notice">
                No recorded votes match these filters.{" "}
                <button type="button" className="link-btn" onClick={clearAll}>
                  Clear filters
                </button>
              </div>
            ) : (
              groups(visibleVotes).map((g) => (
                <section key={g.key} className="month-group">
                  <h3 className="month-heading">{monthLabel(g.key)}</h3>
                  <ul className="vote-list">
                    {g.rows.map((m) => (
                      <VoteCard key={m.id} m={m} member={f.member} />
                    ))}
                  </ul>
                </section>
              ))
            )}
            {votes.length > shown && (
              <button type="button" className="show-more" onClick={() => setShown((s) => s + PAGE)}>
                Show more ({votes.length - shown} left)
              </button>
            )}
          </>
        ) : (
          <>
            <InfoHeading title="Meetings" label="meetings">
              <p>
                Council and General Government Committee meetings, newest first.
                Open a meeting to see every motion, who moved and seconded it,
                the result, and a link to the official minutes.
              </p>
            </InfoHeading>
            <p className="result-count" aria-live="polite">
              {meetingRows.length} {meetingRows.length === 1 ? "meeting" : "meetings"}
            </p>
            {meetingRows.length === 0 ? (
              <div className="notice">No meetings match these filters.</div>
            ) : (
              groups(meetingRows).map((g) => (
                <section key={g.key} className="month-group">
                  <h3 className="month-heading">{monthLabel(g.key)}</h3>
                  <ul className="meeting-list">
                    {g.rows.map((m) => (
                      <li key={m.id}>
                        <Link href={`/votes/${m.id}`}>
                          <span className="ml-date">{formatDate(m.date)}</span>
                          <span className="ml-type">{m.type}</span>
                          <span className="ml-count">
                            {m.motions ? `${m.motions} motions` : "No motions read"}
                            {m.split > 0 && ` · ${m.split} split`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}
