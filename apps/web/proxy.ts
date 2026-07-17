import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/server/database/types";
import {
  getSupabasePublicEnvironment,
  hasSupabasePublicEnvironment
} from "@/server/supabase/env";

const publicAuthPaths = new Set(["/sign-in", "/sign-up", "/auth/callback"]);

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnvironment()) {
    return NextResponse.next({ request });
  }

  const { publishableKey, url } = getSupabasePublicEnvironment();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
      }
    }
  });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isPublicAuthPath = publicAuthPaths.has(request.nextUrl.pathname);

  if (!user && !isPublicAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
