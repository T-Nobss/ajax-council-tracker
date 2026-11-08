import InfoHeading from "../../components/InfoHeading";
import ShowMore from "../../components/ShowMore";

// Blank on the form -> a dash.
const money = (v) =>
  v === "" || v == null
    ? "—"
    : Number(v).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
const fromCandidate = (c) =>
  c.candidate_money === "" && c.candidate_goods === ""
    ? ""
    : (Number(c.candidate_money) || 0) + (Number(c.candidate_goods) || 0);

const RESULT = { elected: "Elected", unsuccessful: "Not elected" };

// Election campaign finances from each candidate's Form 4 filing.
export default function CampaignSection({ name, campaigns }) {
  if (!campaigns.length) return null;

  return (
    <>
      <InfoHeading title="Election campaigns" label="election campaigns">
        <p>
          Every candidate must file a financial statement (Form 4) after the
          election, checked by an auditor. These figures are copied from{" "}
          {name}&rsquo;s filings exactly as reported.
        </p>
        <ul className="help-list">
          <li>
            <strong>Donors are listed only if they gave more than $100.</strong>{" "}
            Donations of $100 or less are shown only as a combined total.
          </li>
          <li>
            Only the donor&rsquo;s town or city is shown, as written on the
            filing. Addresses are never shown.
          </li>
          <li>
            &ldquo;From the candidate&rdquo; includes money or goods the
            candidate (or their spouse) put into their own campaign.
          </li>
          <li>A dash (&mdash;) means that line was left blank on the form.</li>
        </ul>
        <p>Tap a year to see the details and the original filing.</p>
      </InfoHeading>

      <ul className="expense-years">
        {campaigns.map((c, i) => {
          const listed = c.donors.reduce((t, d) => t + Number(d.amount), 0);
          return (
            <li key={c.id}>
              <details open={i === 0}>
                <summary>
                  <span className="ey-year">
                    {c.election_year} · {[c.office, c.ward].filter(Boolean).join(", ")}
                    {RESULT[c.result] && ` · ${RESULT[c.result]}`}
                  </span>
                  <span className="ey-total">{money(c.total_contributions)} raised</span>
                </summary>

                <table className="expense-table">
                  <tbody>
                    <tr>
                      <th scope="row">From the candidate or spouse</th>
                      <td className="num">{money(fromCandidate(c))}</td>
                    </tr>
                    <tr>
                      <th scope="row">Donations of $100 or less (combined)</th>
                      <td className="num">{money(c.contributions_100_or_less)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Donations over $100</th>
                      <td className="num">{money(c.contributions_over_100)}</td>
                    </tr>
                    <tr className="ey-sum">
                      <th scope="row">Total contributions</th>
                      <td className="num">{money(c.total_contributions)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Total income (including other income)</th>
                      <td className="num">{money(c.total_income)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Total spent</th>
                      <td className="num">{money(c.total_expenses)}</td>
                    </tr>
                    <tr className="ey-sum">
                      <th scope="row">{Number(c.surplus_deficit) < 0 ? "Deficit" : "Surplus or deficit"}</th>
                      <td className="num">
                        {money(c.surplus_deficit === "" ? "" : Math.abs(Number(c.surplus_deficit)))}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {c.donors.length > 0 && (
                  <>
                    {c.donations_note ? (
                      <InfoHeading
                        level={3}
                        title={`Donors over $100 (${money(listed)})`}
                        label={`the ${c.election_year} donor list`}
                      >
                        <p>{c.donations_note}</p>
                      </InfoHeading>
                    ) : (
                      <h3>Donors over $100 ({money(listed)})</h3>
                    )}
                    <ShowMore className="donor-list" initial={8} step={50} label="donors">
                      {c.donors.map((d, j) => (
                        <li key={j}>
                          <span>
                            <strong>{d.donor_name}</strong>
                            {d.municipality && <span className="donor-town">{d.municipality}</span>}
                          </span>
                          <span className="num">{money(d.amount)}</span>
                        </li>
                      ))}
                    </ShowMore>
                  </>
                )}

                {c.documents.map((d) => (
                  <p key={d.url} className="ey-source">
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      {d.title}
                    </a>
                    {d.description && <> &mdash; {d.description}</>}
                  </p>
                ))}

                <p className="ey-source">
                  Source:{" "}
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer">
                    {c.election_year} Form 4 Financial Statement
                  </a>
                </p>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
