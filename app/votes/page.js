import { getTermsSorted, getVotingRecord, surname } from "@/lib/data";
import PageHero from "../components/PageHero";
import VotesView from "./VotesView";

export const metadata = { title: "Votes" };

const trim = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

export default function VotesPage() {
  const { meetings, motions, people } = getVotingRecord();
  const short = (id) => surname(people.get(id)?.name ?? id);

  const recorded = motions
    .filter((m) => m.meeting && (m.yes.length || m.no.length))
    .map((m) => ({
      id: m.id,
      meetingId: m.meeting_id,
      date: m.meeting.date,
      type: m.meeting.type,
      term: m.meeting.term_id,
      item: m.item,
      text: trim(m.text, 320),
      outcome: m.outcome,
      split: m.split,
      yes: m.yes.map(short),
      no: m.no.map(short),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const counts = new Map();
  for (const m of motions) {
    const c = counts.get(m.meeting_id) ?? { motions: 0, recorded: 0, split: 0 };
    c.motions += 1;
    if (m.yes.length || m.no.length) c.recorded += 1;
    if (m.split) c.split += 1;
    counts.set(m.meeting_id, c);
  }
  const meetingList = [...meetings.values()]
    .map((m) => ({ id: m.id, date: m.date, type: m.type, term: m.term_id, ...(counts.get(m.id) ?? { motions: 0, recorded: 0, split: 0 }) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Terms that have meetings, newest first.
  const termIds = new Set(meetingList.map((m) => m.term));
  const terms = getTermsSorted().filter((t) => termIds.has(t.id)).map((t) => ({ id: t.id, name: t.name }));

  return (
    <>
      <PageHero
        title="Votes"
        lead="Every motion at Council and General Government Committee, and how each member voted when names were recorded."
      />
      <VotesView terms={terms} recorded={recorded} meetings={meetingList} />
    </>
  );
}
