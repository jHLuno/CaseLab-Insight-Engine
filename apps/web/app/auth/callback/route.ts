import { NextResponse } from "next/server";
import { provisionOrganization } from "@/server/auth/provision-organization";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=sign_in_failed", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=sign_in_failed", requestUrl.origin));
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.redirect(new URL("/sign-in?error=sign_in_failed", requestUrl.origin));
  }

  try {
    await provisionOrganization(user.id, user.email, supabase);
  } catch {
    return NextResponse.redirect(
      new URL("/sign-in?error=workspace_unavailable", requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
