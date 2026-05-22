import {
  getFlickrPhotos,
  getBio,
  getAvatarUrl,
  getResumeData,
} from "./_lib/data-service";
import TerminalWall from "./_components/TerminalWall";

export const revalidate = 3600;

// Await the data here (no empty-photo Suspense fallback) so the terminal only
// ever renders with real photos — otherwise returning to the page briefly
// shows an empty grid before swapping in the loaded one. The route's
// loading.tsx covers the fetch while data (revalidated hourly) resolves.
export default async function Home() {
  const [photos, bio, avatar, resume] = await Promise.all([
    getFlickrPhotos(),
    getBio(),
    getAvatarUrl(),
    getResumeData(),
  ]);
  return (
    <TerminalWall photos={photos} bio={bio} avatar={avatar} resume={resume} />
  );
}
