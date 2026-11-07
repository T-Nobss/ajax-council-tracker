"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InfoHeading from "../components/InfoHeading";

const PAGE = 25;

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function Outcome({ outcome }) {
  return <span className={`outcome outcome-${outcome.kind}`}>{outcome.label}</span>;
}

function VoteCard({ m }) {
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
    </li>
  );
}

export default function VotesView({ terms, recorded, meetings }) {
  const [tab, setTab] = useState("recorded");
  const [term, setTerm] = useState(terms[0]?.id ?? "all");
  const [splitOnly, setSplitOnly] = useState(true);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "meetings") setTab("meetings");
    if (p.get("term") && (p.get("term") === "all" || terms.some((t) => t.id === p.get("term")))) setTerm(p.get("term"));
    if (p.get("split") === "0") setSplitOnly(false);
  }, [terms]);

  function update(next) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) url.searchParams.set(k, v);
    window.history.replaceState(null, "", url);
    setShown(PAGE);
  }

  const query = q.trim().toLowerCase();
  const votes = useMemo(
    () =>
      recorded.filter(
        (m) =>
          (term === "all" || m.term === term) &&
          (!splitOnly || m.split) &&
          (!query || `${m.item} ${m.text} ${m.yes.join(" ")} ${m.no.join(" ")}`.toLowerCase().includes(query))
      ),
    [recorded, term, splitOnly, query]
  );
  const meetingRows = meetings.filter((m) => term === "all" || m.term === term);

  return (
    <>
      <div className="filter">
        <label htmlFor="term">Term of council</label>
        <select
          id="term"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            update({ term: e.target.value });
          }}
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value="all">All terms</option>
        </select>
      </div>

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
            aria-selected={tab === id}
            aria-controls="votes-panel"
            onClick={() => {
              setTab(id);
              update({ tab: id });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div id="votes-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tab-panel">
        {tab === "recorded" ? (
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
                Turn the filter off to include unanimous recorded votes too.
              </p>
              <p>
                Names come from the official minutes. A few older minutes are
                scans, read with text recognition, so check the original minutes
                (linked on each meeting page) before quoting a vote.
              </p>
            </InfoHeading>
            <div className="vote-filters">
              <label className="check">
                <input
                  type="checkbox"
                  checked={splitOnly}
                  onChange={(e) => {
                    setSplitOnly(e.target.checked);
                    update({ split: e.target.checked ? "1" : "0" });
                  }}
                />
                Split votes only
              </label>
              <input
                type="search"
                className="search"
                placeholder="Search motions or names"
                aria-label="Search motions or names"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setShown(PAGE);
                }}
              />
            </div>
            <p className="result-count">
              {votes.length} {votes.length === 1 ? "vote" : "votes"}
            </p>
            {votes.length === 0 ? (
              <div className="notice">No recorded votes match.</div>
            ) : (
              <ul className="vote-list">
                {votes.slice(0, shown).map((m) => (
                  <VoteCard key={m.id} m={m} />
                ))}
              </ul>
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
            <ul className="meeting-list">
              {meetingRows.map((m) => (
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
          </>
        )}
      </div>
    </>
  );
}
