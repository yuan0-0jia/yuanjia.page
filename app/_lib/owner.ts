// Single source of truth for the owner's Supabase auth user id. Read from env
// so the UUID stays out of source and can vary between dev/staging/prod. Must
// also match the auth.uid() used in the site/photos RLS policies.
const id = process.env.OWNER_ID;
if (!id) {
  throw new Error(
    "OWNER_ID env var must be set (the owner's Supabase auth user id). " +
      "Add it to .env.local for local dev and to Vercel project settings for production."
  );
}
export const OWNER_ID: string = id;
