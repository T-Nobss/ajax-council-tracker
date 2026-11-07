import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeetings, getVotingRecord, surname } from "@/lib/data";
import { Outcome } from "../VotesView";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMeetings().map((m) => ({ id: m.id }));
}

function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const m = getVotingRecord().meetings.get(id);
  return { title: m ? `${m.type}, ${longDate(m.date)}` : "Meeting not found" };
}

export default async function MeetingPage({ params }) {
  const { id } = await params;
  const { meetings, motions, people } = getVotingRecord();
  const meeting = meetings.get(id);
  if (!meeting) notFound();
  const list = motions.filter((m) => m.meeting_id === id);
  const name = (cid) => people.get(cid)?.name ?? cid;
  const short = (cid) => surname(name(cid));
  const person = (cid, label) =>
    people.has(cid) ? <Link href={`/councillors/${cid}`}>{name(cid)}</Link> : <span>{label || cid}</span>;

  return (
    <>
      <Link href="/votes?tab=meetings" className="crumb">
        ← All meetings
      </Link>
      <h1>{meeting.type}</h1>
      <p className="lead meeting-lead">
        {longDate(meeting.date)}
        {meeting.minutes_url && (
          <>
            {" · "}
            <a href={meeting.minutes_url} target="_blank" rel="noopener noreferrer">
              Official minutes (PDF)
            </a>
          </>
        )}
      </p>

      {list.length === 0 ? (
        <div className="notice">
          No motions have been read from these minutes yet.
          {meeting.minutes_url ? " The official minutes are linked above." : ""}
        </div>
      ) : (
        <ol className="motion-list">
          {list.map((m) => (
            <li key={m.id} id={m.id} className="motion">
              <div className="vote-meta">
                <span className="motion-item">{m.item || "Motion"}</span>
                <Outcome outcome={m.outcome} />
              </div>
              <p className="vote-text">{m.text}</p>
              <p className="motion-movers">
                Moved by {person(m.mover, m.mover)}
                {m.seconder && <> · Seconded by {person(m.seconder, m.seconder)}</>}
              </p>
              {(m.yes.length > 0 || m.no.length > 0) && (
                <div className="tally">
                  <span className="tally-score">
                    {m.yes.length}–{m.no.length}
                  </span>
                  <span className="tally-side tally-yes">
                    <strong>For:</strong> {m.yes.map(short).join(", ") || "none"}
                  </span>
                  <span className="tally-side tally-no">
                    <strong>Against:</strong> {m.no.map(short).join(", ") || "none"}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
