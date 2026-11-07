import Link from "next/link";
import { getPhotos } from "@/lib/data";

// Full-width photo banner with the page title over it.
// `photo` is a file listed in data/photos.csv (e.g. "photos/aerial.jpg").
export default function PageHero({ photo, alt, title, lead, focus = "center", size = "page", children }) {
  const credit = photo ? getPhotos().find((p) => p.file === photo) : null;
  return (
    <section className={`hero hero-${size}${photo ? "" : " hero-plain"}`}>
      {photo && (
        <img
          className="hero-img"
          src={`/${photo}`}
          alt={alt}
          style={{ objectPosition: focus }}
          fetchPriority="high"
        />
      )}
      {photo && <div className="hero-shade" aria-hidden="true" />}
      <div className="container hero-inner">
        <h1>{title}</h1>
        {lead && <p className="hero-lead">{lead}</p>}
        {children}
      </div>
      {credit && (
        <Link href="/credits" className="hero-credit">
          Photo: {credit.author.replace(/\s*\(.*\)$/, "")}, {credit.license}
        </Link>
      )}
    </section>
  );
}
