import { createClient } from "@/utils/supabase/server";
import type { Resume } from "@/app/resume/data";
import { normalizeResume } from "@/app/resume/data";

export type Site = {
  bio: string | null;
  resume: Resume | null;
  resumeMd: string | null;
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
  let data: Record<string, unknown> | null = null;
  let error: { code?: string; message?: string; details?: string; hint?: string } | null = null;
  ({ data, error } = await supabase
    .from("site")
    .select("bio, resume, resume_md, avatar, last_login, last_logout")
    .eq("id", 1)
    .single());

  // If `resume_md` column doesn't exist yet (migration not run), retry without it
  // so the rest of the page keeps working. PostgREST returns 42703 for unknown
  // columns (sometimes surfaced as PGRST204 depending on version).
  if (
    error &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      /resume_md/i.test(error.message ?? ""))
  ) {
    console.warn(
      "[site] resume_md column missing — run: alter table site add column resume_md text;",
    );
    ({ data, error } = await supabase
      .from("site")
      .select("bio, resume, avatar, last_login, last_logout")
      .eq("id", 1)
      .single());
  }

  if (error) {
    // PGRST116 = no row yet; PGRST205 = table not created — both expected pre-setup.
    if (error.code !== "PGRST116" && error.code !== "PGRST205") {
      // Supabase errors don't enumerate nicely with default %o — pull fields explicitly.
      console.error("[site] load error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    return { bio: null, resume: null, resumeMd: null, avatar: null, lastLogin: null, lastLogout: null };
  }

  return {
    bio: (data?.bio as string | null) ?? null,
    resume: data?.resume ? normalizeResume(data.resume as Resume) : null,
    resumeMd: (data?.resume_md as string | null) ?? null,
    avatar: (data?.avatar as string | null) ?? null,
    lastLogin: (data?.last_login as string | null) ?? null,
    lastLogout: (data?.last_logout as string | null) ?? null,
  };
}

/** The resume (or null → caller falls back to the static RESUME).
 *  Prefers the markdown column when it exists; falls back to the legacy JSON. */
export async function getResumeData(): Promise<Resume | null> {
  const site = await getSite();
  if (site.resumeMd) {
    const { parseMd } = await import("../resume/parse-md");
    return parseMd(site.resumeMd);
  }
  return site.resume;
}

import { FLICKR_ALBUM_ID, FLICKR_USER_ID } from "@/app/_lib/flickr-config";

const FLICKR_API_BASE    = "https://www.flickr.com/services/rest";
const FLICKR_PHOTOSET_ID = FLICKR_ALBUM_ID;

export type FlickrAlbum = {
  photos: FlickrPhoto[];
  total: number;
};

export type FlickrPhoto = {
  id: string;
  title: string;
  src: string;
  srcSmall: string;
  srcMedium: string;
  width: number;
  height: number;
};

export async function getFlickrPhotos(): Promise<FlickrAlbum> {
  const apiKey = process.env.FLICKR_API_KEY;

  if (!apiKey) {
    console.error("FLICKR_API_KEY not set");
    return { photos: [], total: 0 };
  }

  // Pull up to 100 photos and rotate a random subset client-side. per_page caps
  // the pool we shuffle from; the album's true size comes back in `total`.
  // extras requests three sizes in one call: url_n (320px) for tiny tiles,
  // url_c (800px) for retina mobile tiles, url_b (1024px) for the lightbox.
  const url = `${FLICKR_API_BASE}/?method=flickr.photosets.getPhotos&api_key=${apiKey}&photoset_id=${FLICKR_PHOTOSET_ID}&user_id=${FLICKR_USER_ID}&extras=url_n,url_c,url_b&format=json&nojsoncallback=1&per_page=100`;

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
      url_c?: string;
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
      // url_c (800px) is the sweet spot for retina mobile tiles — at cols=2
      // on a 400px viewport with 2-3× DPR, the browser needs 350-500px of
      // pixels, so 800px source stays sharp without being wasteful.
      const medium = photo.url_c || `${base}_c.jpg` || large;
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
        srcMedium: medium,
        width,
        height,
      };
    }
  );

  return { photos, total: Number(data.photoset.total) || photos.length };
}
