import { createClient } from "@/utils/supabase/server";
import type { Resume } from "@/app/resume/data";
import { normalizeResume } from "@/app/resume/data";

export type Site = {
  bio: string | null;
  resume: Resume | null;
  avatar: string | null;
  lastLogin: string | null;
  lastLogout: string | null;
};

/**
 * Read the site's singleton content row (id=1) — bio, resume, avatar, and the
 * owner's most recent login/logout timestamps in one query. Falls back to
 * nulls when the row or table is missing, so callers use their static
 * defaults (DEFAULT_BIO, RESUME, no avatar, no login record).
 */
export async function getSite(): Promise<Site> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site")
    .select("bio, resume, avatar, last_login, last_logout")
    .eq("id", 1)
    .single();

  if (error) {
    // PGRST116 = no row yet; PGRST205 = table not created — both expected pre-setup.
    if (error.code !== "PGRST116" && error.code !== "PGRST205") {
      console.error("[site] load error:", error);
    }
    return { bio: null, resume: null, avatar: null, lastLogin: null, lastLogout: null };
  }

  return {
    bio: (data?.bio as string | null) ?? null,
    resume: data?.resume ? normalizeResume(data.resume as Resume) : null,
    avatar: (data?.avatar as string | null) ?? null,
    lastLogin: (data?.last_login as string | null) ?? null,
    lastLogout: (data?.last_logout as string | null) ?? null,
  };
}

/** The resume JSON (or null → caller falls back to the static RESUME). */
export async function getResumeData(): Promise<Resume | null> {
  return (await getSite()).resume;
}

const FLICKR_API_BASE = "https://www.flickr.com/services/rest";
const FLICKR_PHOTOSET_ID = "72177720317181217";
const FLICKR_USER_ID = "186722781@N08";

export type FlickrAlbum = {
  photos: FlickrPhoto[];
  total: number;
};

export type FlickrPhoto = {
  id: string;
  title: string;
  src: string;
  srcSmall: string;
  width: number;
  height: number;
};

export async function getFlickrPhotos(): Promise<FlickrAlbum> {
  const apiKey = process.env.FLICKR_API_KEY;

  if (!apiKey) {
    console.error("FLICKR_API_KEY not set");
    return { photos: [], total: 0 };
  }

  // Pull up to 100 photos and rotate a random 20 client-side. per_page caps
  // the pool we shuffle from; the album's true size comes back in `total`.
  // extras requests both sizes in one call: url_n (320px) for the grid tiles,
  // url_b (1024px) for the lightbox.
  const url = `${FLICKR_API_BASE}/?method=flickr.photosets.getPhotos&api_key=${apiKey}&photoset_id=${FLICKR_PHOTOSET_ID}&user_id=${FLICKR_USER_ID}&extras=url_n,url_b&format=json&nojsoncallback=1&per_page=100`;

  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    console.error("Failed to fetch Flickr photos");
    return { photos: [], total: 0 };
  }

  const data = await res.json();

  if (data.stat !== "ok" || !data.photoset?.photo) {
    console.error("Flickr API error:", data.message);
    return { photos: [], total: 0 };
  }

  const photos: FlickrPhoto[] = data.photoset.photo.map(
    (photo: {
      id: string;
      title: string;
      url_n?: string;
      url_b?: string;
      width_b?: string | number;
      height_b?: string | number;
      server: string;
      secret: string;
    }) => {
      const base = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}`;
      const large = photo.url_b || `${base}_b.jpg`;
      // url_n is missing for a small subset of photos; fall back to the
      // constructed _n.jpg before giving up and using the large URL.
      const small = photo.url_n || `${base}_n.jpg` || large;
      // Flickr returns width_b/height_b alongside url_b — keep them on the
      // photo so the lightbox can reserve aspect-ratio'd space before the
      // image loads (no layout shift on open). Fallback to a 3:2 landscape
      // shape if metadata is somehow missing.
      const width = Number(photo.width_b) || 1024;
      const height = Number(photo.height_b) || 683;
      return {
        id: photo.id,
        title: photo.title,
        src: large,
        srcSmall: small,
        width,
        height,
      };
    }
  );

  return { photos, total: Number(data.photoset.total) || photos.length };
}
