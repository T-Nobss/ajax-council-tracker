import Placeholder from "../placeholder";
import { getMotions } from "@/lib/data";

export const metadata = { title: "Votes" };

export default function VotesPage() {
  return (
    <Placeholder
      title="Votes"
      intro="Motions brought before council, who moved them, and how each councillor voted."
      recordCount={getMotions().length}
      recordLabel="motions"
    />
  );
}
