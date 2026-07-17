import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

const provisionInputSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid()
});

type ProvisioningClient = {
  rpc: (
    functionName: "provision_personal_organization",
    arguments_: { owner_email: string; owner_user_id: string }
  ) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
};

async function requestOrganizationProvision(
  client: ProvisioningClient,
  input: z.infer<typeof provisionInputSchema>
): Promise<string> {
  const { data, error } = await client.rpc("provision_personal_organization", {
    owner_email: input.email,
    owner_user_id: input.userId
  });

  if (error || !data) {
    throw new Error("Unable to provision the research workspace.");
  }

  return data;
}

export async function provisionOrganization(
  userId: string,
  email: string,
  client?: ProvisioningClient
): Promise<string> {
  const input = provisionInputSchema.parse({ email, userId });

  if (client) {
    return requestOrganizationProvision(client, input);
  }

  const supabase = await createServerSupabaseClient();
  return requestOrganizationProvision(supabase, input);
}
