import {
  getBudget,
  getBudgetReconciliation,
  getCapitalProjects,
} from "@/lib/data";
import BudgetView from "./BudgetView";

export const metadata = { title: "Budget" };

const num = (v) => Number(v) || 0;

export default function BudgetPage() {
  const budget = getBudget();
  const capital = getCapitalProjects();
  const recon = getBudgetReconciliation();

  const years = [...new Set([...budget, ...capital].map((r) => r.year))].sort(
    (a, b) => b.localeCompare(a)
  );

  const byYear = {};
  for (const year of years) {
    const ops = budget.filter((r) => r.year === year);
    const projects = capital
      .filter((r) => r.year === year)
      .map((r) => {
        // "Canoe Replacement (24000901)" -> name + project number
        const m = /^(.*)\s\((\d{7,8})\)$/.exec(r.project_name);
        return {
          name: m ? m[1] : r.project_name,
          number: m ? m[2] : "",
          department: r.department,
          cost: num(r.cost),
          funding: r.funding_source,
          page: r.page,
        };
      })
      .sort((a, b) => b.cost - a.cost);
    const rc = recon.find((r) => r.year === year);

    byYear[year] = {
      operating: ops.map((r) => ({
        department: r.department,
        gross: num(r.gross_expenditure),
        revenue: num(r.revenue),
        net: num(r.net_budget),
        page: r.page,
      })),
      operatingSource: ops[0]?.source_url ?? "",
      capital: projects,
      capitalSource: capital.find((r) => r.year === year)?.source_url ?? "",
      reconciliation: rc
        ? Object.fromEntries(
            Object.entries(rc).map(([k, v]) => [k, k === "source_url" ? v : num(v)])
          )
        : null,
    };
  }

  return (
    <>
      <h1>Budget</h1>
      <p className="lead">
        How the Town of Ajax plans to spend each year, from its published budget
        books.
      </p>
      {years.length === 0 ? (
        <div className="notice">No budget data has been added yet.</div>
      ) : (
        <BudgetView years={years} byYear={byYear} />
      )}
    </>
  );
}
