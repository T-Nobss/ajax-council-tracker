"use client";

import InfoHeading from "../components/InfoHeading";

const TOWN_PAGE =
  "https://ajax.ca/town-hall/governance-accountability/budget-financial-services/budgets-financial-reports/";

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function DocList({ docs }) {
  return (
    <ul className="doc-list">
      {docs.map((doc) => (
        <li key={doc.url}>
          <a href={doc.url} target="_blank" rel="noopener noreferrer">
            {doc.title}
          </a>
          <span className="doc-type">PDF</span>
        </li>
      ))}
    </ul>
  );
}

// The "Documents" tab: the Town's own budget books and financial reports.
export default function DocumentsView({ year, docs, adoption }) {
  const budgetDocs = docs.filter((d) => d.group === "Budget");
  const reportDocs = docs.filter((d) => d.group === "Financial statements");
  const byMayor = adoption && /mayor/i.test(adoption.adopted_by);

  return (
    <>
      <InfoHeading
        title={byMayor ? `${year} Mayor’s Budget` : `${year} Budget`}
        label="budget documents"
      >
        <p>
          Since 2024, Ajax&rsquo;s budget has been prepared and proposed by the
          Mayor under Ontario&rsquo;s strong mayor powers. Council can amend it,
          the Mayor can veto amendments, and Council can override a veto with a
          two-thirds vote. If Council doesn&rsquo;t change it, it&rsquo;s
          adopted as proposed.
        </p>
        <p>
          &ldquo;Amended&rdquo; documents are the final versions, including any
          changes made before the budget was adopted. The numbers on the
          Planned tab come from these books.
        </p>
      </InfoHeading>
      {adoption && (
        <p className="doc-adopted">
          {byMayor
            ? `Adopted under strong mayor powers on ${formatDate(adoption.date)}.`
            : `Adopted by Council on ${formatDate(adoption.date)}.`}
        </p>
      )}
      {budgetDocs.length ? (
        <DocList docs={budgetDocs} />
      ) : (
        <div className="notice">No budget documents listed for {year}.</div>
      )}

      <InfoHeading title="Financial statements" label="financial statements">
        <p>
          The audited financial statements report what the Town actually
          received and spent during the year. An independent auditor checks
          them. They&rsquo;re usually published in the middle of the following
          year. The Actual tab comes from these.
        </p>
      </InfoHeading>
      {reportDocs.length ? (
        <DocList docs={reportDocs} />
      ) : (
        <div className="notice">
          The {year} financial statements aren&rsquo;t out yet. They&rsquo;re
          usually published in the middle of the following year.
        </div>
      )}

      <p className="doc-more">
        More documents, including older years, are on the{" "}
        <a href={TOWN_PAGE} target="_blank" rel="noopener noreferrer">
          Town of Ajax budgets and financial reports page
        </a>
        .
      </p>
    </>
  );
}
