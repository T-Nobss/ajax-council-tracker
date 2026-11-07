import { getCouncillorsWithSeats, getTermsSorted } from "@/lib/data";
import CouncillorList from "./CouncillorList";

export const metadata = { title: "Councillors" };

export default function CouncillorsPage() {
  const terms = getTermsSorted().map((t) => ({ id: t.id, name: t.name }));
  const councillors = getCouncillorsWithSeats().map((c) => ({
    id: c.id,
    name: c.name,
    seats: c.seats.map((s) => ({
      term_id: s.term_id,
      term_name: s.term?.name ?? s.term_id,
      role: s.role,
      ward: s.ward,
    })),
  }));

  return (
    <>
      <h1>Councillors</h1>
      <p className="lead">
        Members of Ajax Town Council, the terms they served and the wards they
        represent.
      </p>
      <CouncillorList terms={terms} councillors={councillors} />
    </>
  );
}
