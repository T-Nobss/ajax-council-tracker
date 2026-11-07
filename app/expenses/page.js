import Placeholder from "../placeholder";
import { getExpenses } from "@/lib/data";

export const metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <Placeholder
      title="Expenses"
      intro="Councillor expenses by year and category, as reported by the Town of Ajax."
      recordCount={getExpenses().length}
      recordLabel="expense records"
    />
  );
}
