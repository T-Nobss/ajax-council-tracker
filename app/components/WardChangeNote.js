// Context for comparing wards across the 2018 change from four wards to three.
export const WARD_CHANGE_SOURCE = "https://globalnews.ca/news/4540132/ajax-municipal-election-2018/";

export default function WardChangeNote() {
  return (
    <aside className="context-note" aria-label="About the 2018 ward change">
      <strong>Ajax went from four wards to three in 2018.</strong> In the
      2014–2018 term there were four wards, two Regional Councillors (one for
      Wards 1 &amp; 2 and one for Wards 3 &amp; 4) and a Local Councillor for
      each ward. For the 2018 election the Town moved to three wards to add a
      seat on Durham Regional Council, so since then each ward elects one
      Regional and one Local Councillor. Council stayed at seven members. Ward
      numbers before and after the change cover different areas.{" "}
      <a href={WARD_CHANGE_SOURCE} target="_blank" rel="noopener noreferrer">
        Source
      </a>
    </aside>
  );
}
