import Link from "next/link";

export const metadata = { title: "Budget" };

export default function BudgetPage() {
  return (
    <>
      <h1>Budget</h1>
      <p className="lead">
        How the Town of Ajax plans to raise and spend money each year.
      </p>
      <div className="notice">This page is coming soon.</div>
      <Link href="/" className="back">
        ← Back to home
      </Link>
    </>
  );
}
