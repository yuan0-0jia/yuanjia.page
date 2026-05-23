"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { normalizeResume, type Resume } from "@/app/resume/data";

export async function login() {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/`,
    },
  });

  if (error) {
    redirect("/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

// Clears the session only — the caller does a full reload to /?auth=out so the
// terminal remounts (refreshing auth state + showing the sign-out indicator).
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getUser() {
  const supabase = await createClient();

  return supabase.auth.getUser();
}

/**
 * Replace the profile avatar. Auth-gated. Uploads the image to the `photos`
 * storage bucket under a timestamped name (so the public URL changes and no
 * stale CDN copy is served), then points `site.avatar` (singleton row id=1) at it.
 */
export async function updateAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be logged in");

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    throw new Error("An image file is required");
  }

  const safeName = image.name.replaceAll("/", "").replace(/\s+/g, "_");
  const objectName = `avatar-${Date.now()}-${safeName}`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${objectName}`;

  // The cookie-based ssr client sends Storage uploads with the anon key as the
  // bearer, so RLS sees `anon` and the owner-only `photos` policies reject the
  // write (table writes are unaffected — PostgREST forwards the user token).
  // Forward the access token explicitly so the upload authenticates as the
  // owner and the uid-scoped storage policy applies.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in");

  const authed = createTokenClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => session.access_token }
  );

  const { error: storageError } = await authed.storage
    .from("photos")
    .upload(objectName, image, { upsert: true, contentType: image.type });

  if (storageError) {
    console.error("[avatar] upload error:", storageError);
    throw new Error(`Avatar could not be uploaded: ${storageError.message}`);
  }

  const { error: updateError } = await supabase
    .from("site")
    .update({ avatar: publicUrl })
    .eq("id", 1);

  if (updateError) {
    console.error("[avatar] row update error:", updateError);
    throw new Error(`Avatar uploaded but the record update failed: ${updateError.message}`);
  }

  revalidatePath("/", "layout");
}

/**
 * Replace the about.md bio. Auth-gated. Writes it to `site.bio` (singleton row
 * id=1) and revalidates the homepage.
 */
export async function updateBio(bio: string) {
  const { data, error } = await getUser();
  if (error || !data?.user) throw new Error("You must be logged in");

  const supabase = await createClient();
  const { data: updated, error: updateError } = await supabase
    .from("site")
    .update({ bio })
    .eq("id", 1)
    .select();

  if (updateError) {
    console.error("[bio] update error:", updateError);
    throw new Error(`Bio could not be updated: ${updateError.message}`);
  }
  if (!updated || updated.length === 0) {
    throw new Error(
      "Bio update matched 0 rows — your session may lack write permission (check RLS) or the site row is missing."
    );
  }

  revalidatePath("/");
}

/**
 * Replace the resume JSON in Supabase. Auth-gated.
 * Writes the full resume object to `site.resume` (singleton row id=1).
 * Revalidates the /resume route on success.
 */
export async function updateResumeData(resume: Resume) {
  const { data, error } = await getUser();
  if (error || !data?.user) throw new Error("You must be logged in");

  const supabase = await createClient();

  // .select() asks for the updated rows back so we can see if RLS silently
  // filtered the write. Without this the call returns success even when 0
  // rows were actually changed.
  // Normalize before persisting so a hand-edited JSON buffer can't write an
  // invalid shape (it's only sanitized on read otherwise — round-tripping
  // would silently drop/mutate data).
  const { data: updated, error: updateError } = await supabase
    .from("site")
    .update({ resume: normalizeResume(resume) })
    .eq("id", 1)
    .select();

  if (updateError) {
    console.error("[resume] update error:", updateError);
    throw new Error(`Resume could not be updated: ${updateError.message}`);
  }

  if (!updated || updated.length === 0) {
    console.error(
      "[resume] UPDATE affected 0 rows — RLS rejected the write or the site row is missing. Authenticated user:",
      data.user.email
    );
    throw new Error(
      "Resume save matched 0 rows — your auth session may not have write permission. Check RLS policies and that you're logged in to the correct Supabase project."
    );
  }

  revalidatePath("/resume");
}
