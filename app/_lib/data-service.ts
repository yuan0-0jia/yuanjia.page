import { createClient } from "@/utils/supabase/server";

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
    throw new Error("Projects could not be loaded");
  }

  return data;
}

export async function getAbout() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("about").select("*");

  if (error) {
    console.error(error);
    throw new Error("About could not be loaded");
  }

  return data;
}

const FLICKR_FEED_URL =
  "https://www.flickr.com/services/feeds/photos_public.gne?id=186722781@N08&format=json&nojsoncallback=1";

export async function getFlickrPhotos() {
  const res = await fetch(FLICKR_FEED_URL, { next: { revalidate: 3600 } });

  if (!res.ok) {
    console.error("Failed to fetch Flickr photos");
    return [];
  }

  const data = await res.json();

  return (data.items ?? []).map(
    (item: { title: string; link: string; media: { m: string } }) => ({
      title: item.title,
      link: item.link,
      // Swap _m (240px) for _b (1024px)
      src: item.media.m.replace("_m.jpg", "_b.jpg"),
    })
  );
}
