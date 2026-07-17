type PublicSupabaseEnvironment = {
  publishableKey: string;
  url: string;
};

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasSupabasePublicEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

export function getSupabasePublicEnvironment(): PublicSupabaseEnvironment {
  return {
    url: requiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requiredEnvironmentValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    )
  };
}

export function getSupabaseServiceRoleKey(): string {
  return requiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");
}
