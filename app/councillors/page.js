import Placeholder from "../placeholder";
import { getCouncillors } from "@/lib/data";

export const metadata = { title: "Councillors" };

export default function CouncillorsPage() {
  return (
    <Placeholder
      title="Councillors"
      intro="Members of Ajax Town Council, the terms they served and the wards they represent."
      recordCount={getCouncillors().length}
      recordLabel="councillors"
    />
  );
}
