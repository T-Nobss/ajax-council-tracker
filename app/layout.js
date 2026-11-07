import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: {
    default: "Ajax Council Tracker",
    template: "%s · Ajax Council Tracker",
  },
  description:
    "Voting records, expenses and budgets for Ajax Town Council, from public records.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const nav = [
  { href: "/councillors", label: "Councillors" },
  { href: "/votes", label: "Votes" },
  { href: "/spending", label: "Spending" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              Ajax Council Tracker
            </Link>
            <nav aria-label="Main">
              <ul className="nav">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            An independent project. All information comes from public records
            published by the Town of Ajax.
          </div>
        </footer>
      </body>
    </html>
  );
}
