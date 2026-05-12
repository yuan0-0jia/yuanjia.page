import { createClient } from "@/utils/supabase/server";
import type { Resume } from "@/app/resume/data";
import { normalizeResume } from "@/app/resume/data";

export async function getAvatar() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("avatar").select("*");

  if (error) {
    console.error(error);
  }

  return data;
}

export async function getProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*");

  if (error) {
    console.error("Projects could not be loaded:", error);
    return [];
  }

  return data;
}

/**
 * Read the resume JSON from Supabase (singleton row id=0).
 * Returns null when the row is missing or `data` is null — the caller
 * is expected to fall back to the static RESUME default from
 * app/resume/data.ts.
 */
export async function getResumeData(): Promise<Resume | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resume")
    .select("data")
    .eq("id", 0)
    .single();

  if (error) {
    // Both of these are "expected on first run" states — fall back silently.
    //   PGRST116 — single() returned no rows (table exists but id=0 missing)
    //   PGRST205 — table missing from PostgREST schema cache
    if (error.code === "PGRST205") {
      console.warn(
        "[resume] table not yet created — run app/resume/MIGRATION.sql in Supabase to enable editing. Falling back to static data."
      );
    } else if (error.code !== "PGRST116") {
      console.error("Resume could not be loaded:", error);
    }
    return null;
  }

  const raw = (data?.data as Resume | null) ?? null;
  return raw ? normalizeResume(raw) : null;
}

export async function getAboutContent() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("about")
    .select("content_json")
    .eq("id", 0)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data?.content_json;
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

export async function getPhotoExif(photoId: string) {
  const apiKey = process.env.FLICKR_API_KEY;
  if (!apiKey) return null;

  const url = `${FLICKR_API_BASE}/?method=flickr.photos.getExif&api_key=${apiKey}&photo_id=${photoId}&format=json&nojsoncallback=1`;

  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) return null;

  const data = await res.json();

  if (data.stat !== "ok" || !data.photo?.exif) return null;

  const exifTags = data.photo.exif as Array<{
    tag: string;
    label: string;
    raw: { _content: string };
    clean?: { _content: string };
  }>;

  const getTag = (tag: string) => {
    const found = exifTags.find((t) => t.tag === tag);
    return found?.clean?._content || found?.raw?._content || null;
  };

  const getRawTag = (tag: string) => {
    const found = exifTags.find((t) => t.tag === tag);
    return found?.raw?._content || found?.clean?._content || null;
  };

  return {
    camera: getTag("Model"),
    lens: getTag("LensModel") || getTag("Lens"),
    aperture: getTag("FNumber"),
    shutter: getRawTag("ExposureTime"),
    iso: getTag("ISO"),
    focalLength: getTag("FocalLength"),
    film: getTag("ImageDescription") || getTag("Film"),
  };
}
