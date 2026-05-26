import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL;

  // Check for OAuth error and redirect.
  //   access_denied  → terminal status line on home (handled by TerminalWall's
  //                    authNotice effect via ?auth_error=access_denied).
  //   anything else  → /error page (real server-side failure).
  const error = searchParams.get("error");
  if (error) {
    if (error === "access_denied") {
      return NextResponse.redirect(`${origin}/?auth_error=access_denied`);
    }
    return NextResponse.redirect(
      `${origin}/error?error=${encodeURIComponent(error)}`
    );
  }

  // Handle successful OAuth code
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (!sessionError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const redirectBase = isLocalEnv
        ? origin
        : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

      // Flag a fresh sign-in so the homepage can show a success indicator.
      const sep = next.includes("?") ? "&" : "?";
      return NextResponse.redirect(`${redirectBase}${next}${sep}auth=in`);
    }
  }

  // If code is missing or session exchange failed, redirect to error page
  return NextResponse.redirect(`${origin}/error?error=auth_code_error`);
}
