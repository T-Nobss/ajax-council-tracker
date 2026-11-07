// Number formatting shared by the Budget page tabs.

export const fmtFull = (n) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export function fmtShort(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return fmtFull(n);
}

// Full amount on wide screens, "$26.8M" style on phones.
export function Money({ value }) {
  return (
    <>
      <span className="m-full">{fmtFull(value)}</span>
      <span className="m-short">{fmtShort(value)}</span>
    </>
  );
}

export const pdfPage = (url, page) => `${url}#page=${String(page).split("-")[0]}`;

// "+$3.9M" / "−$3.9M" for differences between actual and budget.
export function Diff({ value }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const a = Math.abs(value);
  return (
    <span className={value > 0 ? "diff-up" : value < 0 ? "diff-down" : ""}>
      <span className="m-full">{sign}{fmtFull(a)}</span>
      <span className="m-short">{sign}{fmtShort(a)}</span>
    </span>
  );
}
