import { getCouncillorPhotos, getCouncillorsWithSeats, getTermsSorted } from "@/lib/data";
import PageHero from "../components/PageHero";
import CouncillorList from "./CouncillorList";

export const metadata = { title: "Councillors" };

export default function CouncillorsPage() {
  const photos = getCouncillorPhotos();
  const terms = getTermsSorted().map((t) => ({ id: t.id, name: t.name }));
  const councillors = getCouncillorsWithSeats().map((c) => ({
    id: c.id,
    name: c.name,
    photo: photos[c.id]?.file ?? null,
    seats: c.seats.map((s) => ({
      term_id: s.term_id,
      term_name: s.term?.name ?? s.term_id,
      role: s.role,
      ward: s.ward,
    })),
  }));

  return (
    <>
      <PageHero
        photo="photos/ajax-sign.jpg"
        alt="The large AJAX letters sign at Pat Bayly Square"
        title="Councillors"
        lead="Members of Ajax Town Council, the terms they served and the wards they represent."
        focus="center 72%"
      />
      <CouncillorList terms={terms} councillors={councillors} />
    </>
  );
}
