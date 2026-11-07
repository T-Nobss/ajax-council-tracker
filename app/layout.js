import Link from "next/link";
import Nav from "./components/Nav";
import "./globals.css";

export const metadata = {
  title: {
    default: "Ajax Council Tracker",
    template: "%s · Ajax Council Tracker",
  },
  description:
    "Voting records, pay, expenses and budgets for Ajax Town Council, from public records. An independent project.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c2a56",
};

const nav = [
  { href: "/councillors", label: "Councillors" },
  { href: "/votes", label: "Votes" },
  { href: "/spending", label: "Spending" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-text">
                Ajax Council Tracker
                <span className="brand-tag">Independent</span>
              </span>
            </Link>
            <Nav items={nav} />
          </div>
        </header>
        <main id="main" className="container">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <p className="footer-brand">Ajax Council Tracker</p>
              <p>
                An independent project, not affiliated with or endorsed by the
                Town of Ajax. All information comes from public records and
                links to its source.
              </p>
            </div>
            <ul className="footer-links">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href}>{n.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/credits">About &amp; photo credits</Link>
              </li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
