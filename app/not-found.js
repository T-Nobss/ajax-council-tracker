import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p className="lead">We couldn't find that page.</p>
      <Link href="/">← Back to home</Link>
    </>
  );
}
