import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeetings, getVotingRecord, surname } from "@/lib/data";
import { Outcome, ProceduralTag, Tally } from "../VotesView";

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
              <ProceduralTag kind={m.procedural} />
              <p className="vote-text">{m.text}</p>
              <p className="motion-movers">
                Moved by {person(m.mover, m.mover)}
                {m.seconder && <> · Seconded by {person(m.seconder, m.seconder)}</>}
              </p>
              {(m.yes.length > 0 || m.no.length > 0) && (
                <Tally
                  yes={m.yes.map(short)}
                  no={m.no.map(short)}
                  absent={m.absent.map((x) => short(x.id) + (x.note ? ` (${x.note})` : ""))}
                  notVoting={m.notVoting.map((x) => short(x.id) + (x.note ? ` (${x.note})` : ""))}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
