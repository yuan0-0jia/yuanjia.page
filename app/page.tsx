import { getFlickrPhotos, getSite } from "./_lib/data-service";
import TerminalWall from "./_components/TerminalWall";

export const revalidate = 3600;

// Await the data here (no empty-photo Suspense fallback) so the terminal only
// ever renders with real photos — otherwise returning to the page briefly
// shows an empty grid before swapping in the loaded one. bio/avatar/resume all
// come from the single `site` row in one query.
export default async function Home() {
  const [album, site] = await Promise.all([getFlickrPhotos(), getSite()]);
  return (
    <TerminalWall
      photos={album.photos}
      albumTotal={album.total}
      bio={site.bio}
      avatar={site.avatar}
      resumeMd={site.resumeMd}
      lastLogin={site.lastLogin}
      lastLogout={site.lastLogout}
    />
  );
}
