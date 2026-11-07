import Link from "next/link";

// Shared layout for pages that are not built yet.
export default function Placeholder({ title, intro, recordCount, recordLabel }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="lead">{intro}</p>
      <div className="notice">
        This page is coming soon.{" "}
        {recordCount === 0
          ? `No ${recordLabel} have been added yet.`
          : `${recordCount} ${recordLabel} loaded so far.`}
      </div>
      <Link href="/" className="back">
        ← Back to home
      </Link>
    </>
  );
}
