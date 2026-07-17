"use server";

import { redirect } from "next/navigation";
import { authCredentialsSchema } from "@/server/auth/credentials";
import { provisionOrganization } from "@/server/auth/provision-organization";
import { createServerSupabaseClient } from "@/server/supabase/server";

function readCredentials(formData: FormData) {
  return authCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
}

function authCallbackUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL("/auth/callback", siteUrl).toString();
}

export async function signInAction(formData: FormData) {
  const credentials = readCredentials(formData);

  if (!credentials.success) {
    redirect("/sign-in?error=invalid_credentials");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error || !data.user?.email) {
    redirect("/sign-in?error=sign_in_failed");
  }

  try {
    await provisionOrganization(data.user.id, data.user.email, supabase);
  } catch {
    redirect("/sign-in?error=workspace_unavailable");
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const credentials = readCredentials(formData);

  if (!credentials.success) {
    redirect("/sign-up?error=invalid_credentials");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials.data,
    options: { emailRedirectTo: authCallbackUrl() }
  });

  if (error) {
    redirect("/sign-up?error=sign_up_failed");
  }

  if (data.session && data.user?.email) {
    try {
      await provisionOrganization(data.user.id, data.user.email, supabase);
      redirect("/");
    } catch {
      redirect("/sign-up?error=workspace_unavailable");
    }
  }

  redirect("/sign-in?message=check_email");
}
