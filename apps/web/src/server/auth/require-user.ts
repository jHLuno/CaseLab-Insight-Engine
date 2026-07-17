import { redirect } from "next/navigation";
import { provisionOrganization } from "./provision-organization";
import { createServerSupabaseClient } from "@/server/supabase/server";

export type AuthenticatedUser = {
  email: string;
  organizationId: string;
  userId: string;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/sign-in");
  }

  const organizationId = await provisionOrganization(user.id, user.email);

  return {
    email: user.email,
    organizationId,
    userId: user.id
  };
}
