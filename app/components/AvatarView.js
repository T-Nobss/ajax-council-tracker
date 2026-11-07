// Display-only avatar (safe to use in client components): the official
// headshot if `photo` is given, otherwise the person's initials.
const initials = (name) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function AvatarView({ photo, name, size = 56, shape = "round" }) {
  const style = { width: size, height: shape === "portrait" ? Math.round(size * 1.31) : size };
  if (photo) {
    return <img className={`avatar avatar-${shape}`} src={`/${photo}`} alt="" style={style} loading="lazy" />;
  }
  return (
    <span
      className={`avatar avatar-${shape} avatar-initials`}
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
