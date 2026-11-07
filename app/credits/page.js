import { getCouncillorPhotos, getCouncillors, getPhotos } from "@/lib/data";

export const metadata = { title: "About and photo credits" };

export default function CreditsPage() {
  const photos = getPhotos();
  const heads = getCouncillorPhotos();
  const people = getCouncillors().filter((c) => heads[c.id]);
  return (
    <div className="prose">
      <h1>About and photo credits</h1>

      <h2>About this site</h2>
      <p>
        Ajax Council Tracker is an independent project. It is{" "}
        <strong>not affiliated with or endorsed by the Town of Ajax</strong>.
        Every figure on the site comes from public records, mostly published by
        the Town, and links back to its source so you can check it.
      </p>

      <h2>Scenic photos</h2>
      <ul className="credit-list">
        {photos.map((p) => (
          <li key={p.file}>
            <img src={`/${p.file}`} alt="" loading="lazy" />
            <div>
              <strong>{p.title}</strong>
              <span>
                {p.author}.{" "}
                <a href={p.license_url} target="_blank" rel="noopener noreferrer">
                  {p.license}
                </a>
                , via{" "}
                <a href={p.source_url} target="_blank" rel="noopener noreferrer">
                  Wikimedia Commons
                </a>
                . Resized.
              </span>
            </div>
          </li>
        ))}
      </ul>

      <h2>Councillor photos</h2>
      <p>
        Official portraits of {people.map((c) => c.name).join(", ")} are from
        the Town of Ajax&rsquo;s{" "}
        <a href={Object.values(heads)[0]?.source_url} target="_blank" rel="noopener noreferrer">
          Meet Your Mayor &amp; Council
        </a>{" "}
        page, used to identify elected officials. Photos &copy; Town of Ajax.
        Members without an official portrait are shown with their initials.
      </p>
    </div>
  );
}
