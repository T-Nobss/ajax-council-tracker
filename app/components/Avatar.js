import { getCouncillorPhotos } from "@/lib/data";
import AvatarView from "./AvatarView";

// Server-side avatar: looks up the councillor's official headshot.
export default function Avatar({ id, ...props }) {
  const photo = getCouncillorPhotos()[id];
  return <AvatarView photo={photo?.file} {...props} />;
}
