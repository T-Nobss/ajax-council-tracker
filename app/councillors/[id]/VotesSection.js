import Link from "next/link";
import { getVotingRecord } from "@/lib/data";
import InfoHeading from "../../components/InfoHeading";
import ShowMore from "../../components/ShowMore";
import { Outcome } from "../../votes/VotesView";

function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

// A member's voting record: counts, and the split votes they took part in.
export default function VotesSection({ id, name }) {
  const { motions } = getVotingRecord();
  const moved = motions.filter((m) => m.mover === id).length;
  const seconded = motions.filter((m) => m.seconder === id).length;
  const voted = motions.filter((m) => m.yes.includes(id) || m.no.includes(id));
  const split = voted
    .filter((m) => m.split && m.meeting)
    .sort((a, b) => b.meeting.date.localeCompare(a.meeting.date) || a.id.localeCompare(b.id));
  const losing = split.filter(
    (m) => (m.outcome.kind === "carried" && m.no.includes(id)) || (m.outcome.kind === "lost" && m.yes.includes(id))
  ).length;

  if (!moved && !seconded && !voted.length) {
    return (
      <>
        <h2>Votes</h2>
        <div className="notice">No votes recorded yet.</div>
      </>
    );
  }

  return (
    <>
      <InfoHeading title="Votes" label="this member's votes">
        <p>
          From the official minutes of Council and General Government Committee
          meetings.
        </p>
        <ul className="help-list">
          <li>
            <strong>Recorded votes</strong> are motions where the minutes list
            each member&rsquo;s vote. Most motions before 2025 don&rsquo;t, so
            this is only part of {name}&rsquo;s record.
          </li>
          <li>
            <strong>Split votes</strong> are recorded votes where members
            disagreed. <strong>On the losing side</strong> counts split votes
            where {name} voted against the result.
          </li>
          <li>
            <strong>Moved</strong> and <strong>seconded</strong> count every
            motion in the minutes, recorded or not.
          </li>
        </ul>
      </InfoHeading>

      <ul className="stats stats-4">
        <li>
          <span className="stat-label">Recorded votes</span>
          <strong className="stat-value">{voted.length}</strong>
        </li>
        <li>
          <span className="stat-label">Split votes</span>
          <strong className="stat-value">{split.length}</strong>
          <span className="stat-sub">On the losing side: {losing}</span>
        </li>
        <li>
          <span className="stat-label">Motions moved</span>
          <strong className="stat-value">{moved}</strong>
        </li>
        <li>
          <span className="stat-label">Motions seconded</span>
          <strong className="stat-value">{seconded}</strong>
        </li>
      </ul>

      {split.length > 0 && (
        <>
          <h3 className="sub-heading">Split votes</h3>
          <ShowMore className="member-votes" initial={5} step={10} label="split votes">
            {split.map((m) => {
              const vote = m.yes.includes(id) ? "For" : "Against";
              return (
                <li key={m.id}>
                  <span className={`mv-vote mv-${vote.toLowerCase()}`}>{vote}</span>
                  <span className="mv-body">
                    <Link href={`/votes/${m.meeting_id}#${m.id}`}>{m.item || "Motion"}</Link>
                    <span className="mv-meta">
                      {shortDate(m.meeting.date)} · {m.meeting.type} · {m.yes.length}–{m.no.length}{" "}
                      <Outcome outcome={m.outcome} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ShowMore>
        </>
      )}
    </>
  );
}
