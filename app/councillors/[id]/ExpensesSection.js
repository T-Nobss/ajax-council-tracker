import InfoHeading from "../../components/InfoHeading";

const money = (n) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

// Plain-language names for the statement's columns.
const LABELS = {
  "Remuneration/Benefits": "Pay and benefits",
  "Travel Allowance": "Travel allowance",
  "Communication/Meeting Expenses": "Communication and meeting expenses",
  "Education/Training": "Education and training (conferences, courses)",
  "AMO Board Appointment": "AMO board appointment",
};
const label = (cat) => {
  for (const [k, v] of Object.entries(LABELS)) {
    if (cat.startsWith(k)) return v + cat.slice(k.length);
  }
  return cat;
};

// "Elexicon Corporation: Remuneration" -> paid by another body.
const isOutside = (cat) => cat.includes(":");

export default function ExpensesSection({ name, years }) {
  if (!years.length) {
    return (
      <>
        <h2>Expenses</h2>
        <div className="notice">No expense records yet.</div>
      </>
    );
  }
  const hasOutside = years.some((y) => y.items.some((i) => isOutside(i.category)));

  return (
    <>
      <InfoHeading title="Expenses" label="pay and expenses">
        <p>
          Every year by March 31, the Town&rsquo;s treasurer must report what
          each member of Council was paid and spent in the year before (Municipal
          Act, section 284). These figures come from those reports.
        </p>
        <ul className="help-list">
          <li>
            <strong>Pay and benefits:</strong> what the Town reports paying
            this member, including benefits. It won&rsquo;t match the Salary
            section above, which comes from a different report (the provincial
            Sunshine List) that counts pay differently.
          </li>
          <li>
            <strong>Travel allowance:</strong> a fixed allowance set by the
            Town. It&rsquo;s about the same for every councillor; the
            Mayor&rsquo;s is higher.
          </li>
          <li>
            <strong>Communication and meeting expenses</strong> and{" "}
            <strong>education and training</strong> are claimed costs, as
            reported by the Town.
          </li>
          <li>
            Other lines are costs of specific roles or trips, named as the
            Town reports them.
          </li>
        </ul>
        {hasOutside && (
          <p>
            <strong>Paid by other organizations</strong> lists money from
            boards {name} sits on because of their Council role, such as
            Elexicon (the local electricity company) or the Ajax Public Library
            Board. The Town reports it in the same statement, but it&rsquo;s
            paid by those organizations, so it isn&rsquo;t in the Town total.
          </p>
        )}
        <p>Tap a year to see the breakdown and the original report.</p>
      </InfoHeading>

      <ul className="expense-years">
        {years.map((y, i) => {
          const town = y.items.filter((it) => !isOutside(it.category));
          const outside = y.items.filter((it) => isOutside(it.category));
          const total = town.reduce((t, it) => t + it.amount, 0);
          return (
            <li key={y.year}>
              <details open={i === 0}>
                <summary>
                  <span className="ey-year">{y.year}</span>
                  <span className="ey-total">{money(total)}</span>
                </summary>
                <table className="expense-table">
                  <tbody>
                    {town.map((it) => (
                      <tr key={it.category}>
                        <th scope="row">{label(it.category)}</th>
                        <td className="num">{money(it.amount)}</td>
                      </tr>
                    ))}
                    <tr className="ey-sum">
                      <th scope="row">Total paid by the Town</th>
                      <td className="num">{money(total)}</td>
                    </tr>
                  </tbody>
                </table>
                {outside.length > 0 && (
                  <>
                    <p className="ey-sub">Paid by other organizations</p>
                    <table className="expense-table">
                      <tbody>
                        {outside.map((it) => (
                          <tr key={it.category}>
                            <th scope="row">{it.category}</th>
                            <td className="num">{money(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {y.source && (
                  <p className="ey-source">
                    Source:{" "}
                    <a href={y.source} target="_blank" rel="noopener noreferrer">
                      {y.year} Statement of Remuneration and Expenses
                    </a>
                  </p>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
