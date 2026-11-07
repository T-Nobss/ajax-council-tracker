import {
  getActuals,
  getBudget,
  getBudgetAdoption,
  getBudgetReconciliation,
  getCapitalProjects,
  getDocuments,
} from "@/lib/data";
import BudgetView from "./BudgetView";

export const metadata = { title: "Spending" };

const num = (v) => Number(v) || 0;

export default function BudgetPage() {
  const budget = getBudget();
  const capital = getCapitalProjects();
  const recon = getBudgetReconciliation();
  const actuals = getActuals();
  const documents = getDocuments();
  const adoption = getBudgetAdoption();

  const years = [
    ...new Set([...budget, ...capital, ...actuals, ...documents].map((r) => r.year)),
  ].sort((a, b) => b.localeCompare(a));

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
    const act = actuals.filter((r) => r.year === year);
    const toLine = (r) => ({ category: r.category, budget: num(r.budget), actual: num(r.actual) });

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
      actuals: act.length
        ? {
            revenue: act.filter((r) => r.section === "revenue").map(toLine),
            expense: act.filter((r) => r.section === "expense").map(toLine),
            source: act[0].source_url,
            page: act[0].page,
          }
        : null,
      documents: documents.filter((r) => r.year === year),
      adoption: adoption.find((r) => r.year === year) ?? null,
    };
  }

  return (
    <>
      <h1>Spending</h1>
      <p className="lead">
        What the Town of Ajax planned to spend, what it actually spent, and the
        documents behind both.
      </p>
      {years.length === 0 ? (
        <div className="notice">No budget data has been added yet.</div>
      ) : (
        <BudgetView years={years} byYear={byYear} />
      )}
    </>
  );
}
