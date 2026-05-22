import { createClient } from "@/utils/supabase/server";
import type { Resume } from "@/app/resume/data";
import { normalizeResume } from "@/app/resume/data";

export type Site = {
  bio: string | null;
  resume: Resume | null;
  avatar: string | null;
};

/**
 * Read the site's singleton content row (id=1) — bio, resume, and avatar in one
 * query. Falls back to nulls when the row or table is missing, so callers use
 * their static defaults (DEFAULT_BIO, RESUME, no avatar).
 */
export async function getSite(): Promise<Site> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site")
    .select("bio, resume, avatar")
    .eq("id", 1)
    .single();

  if (error) {
    // PGRST116 = no row yet; PGRST205 = table not created — both expected pre-setup.
    if (error.code !== "PGRST116" && error.code !== "PGRST205") {
      console.error("[site] load error:", error);
    }
    return { bio: null, resume: null, avatar: null };
  }

  return {
    bio: (data?.bio as string | null) ?? null,
    resume: data?.resume ? normalizeResume(data.resume as Resume) : null,
    avatar: (data?.avatar as string | null) ?? null,
  };
}

/** The resume JSON (or null → caller falls back to the static RESUME). */
export async function getResumeData(): Promise<Resume | null> {
  return (await getSite()).resume;
}

const FLICKR_API_BASE = "https://www.flickr.com/services/rest";
const FLICKR_PHOTOSET_ID = "72177720317181217";
const FLICKR_USER_ID = "186722781@N08";

export async function getFlickrPhotos() {
  const apiKey = process.env.FLICKR_API_KEY;

  if (!apiKey) {
    console.error("FLICKR_API_KEY not set");
    return [];
  }

  const url = `${FLICKR_API_BASE}/?method=flickr.photosets.getPhotos&api_key=${apiKey}&photoset_id=${FLICKR_PHOTOSET_ID}&user_id=${FLICKR_USER_ID}&extras=url_b,url_o&format=json&nojsoncallback=1&per_page=500`;

  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    console.error("Failed to fetch Flickr photos");
    return [];
  }

  const data = await res.json();

  if (data.stat !== "ok" || !data.photoset?.photo) {
    console.error("Flickr API error:", data.message);
    return [];
  }

  return data.photoset.photo.map(
    (photo: {
      id: string;
      title: string;
      url_b?: string;
      url_o?: string;
      server: string;
      secret: string;
    }) => ({
      id: photo.id,
      title: photo.title,
      link: `https://www.flickr.com/photos/${FLICKR_USER_ID}/${photo.id}/in/set-${FLICKR_PHOTOSET_ID}/`,
      src: photo.url_b || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
    })
  );
}
