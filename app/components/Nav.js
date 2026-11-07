"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Main navigation; marks the current section.
export default function Nav({ items }) {
  const path = usePathname() || "/";
  return (
    <nav aria-label="Main">
      <ul className="nav">
        {items.map((item) => {
          const current = path === item.href || path.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
