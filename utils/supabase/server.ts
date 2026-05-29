import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cookieless anon client for reading public content (the `site` singleton,
 * id=1). Because it never touches `cookies()`, routes that use it for their
 * only data fetch stay statically prerenderable (ISR) instead of being forced
 * into per-request dynamic rendering. Use ONLY for data that is identical for
 * every visitor — never for auth-gated reads/writes (use `createClient`).
 */
export function createPublicClient() {
  return createSupabaseClient<any, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<any, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
