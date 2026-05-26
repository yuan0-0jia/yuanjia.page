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

  // Only the 20-photo random sample is rendered, but per_page caps the pool
  // we shuffle from — 100 gives plenty of headroom over the current album
  // size while keeping the metadata response small. extras requests both
  // sizes in one call: url_n (320px) for the grid tiles, url_b (1024px) for
  // the lightbox.
  const url = `${FLICKR_API_BASE}/?method=flickr.photosets.getPhotos&api_key=${apiKey}&photoset_id=${FLICKR_PHOTOSET_ID}&user_id=${FLICKR_USER_ID}&extras=url_n,url_b&format=json&nojsoncallback=1&per_page=100`;

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
      url_n?: string;
      url_b?: string;
      server: string;
      secret: string;
    }) => {
      const base = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}`;
      const large = photo.url_b || `${base}_b.jpg`;
      // url_n is missing for a small subset of photos; fall back to the
      // constructed _n.jpg before giving up and using the large URL.
      const small = photo.url_n || `${base}_n.jpg` || large;
      return {
        id: photo.id,
        title: photo.title,
        src: large,
        srcSmall: small,
      };
    }
  );
}
