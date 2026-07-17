import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(256)
});

export function parseAuthCredentials(input: unknown) {
  return authCredentialsSchema.parse(input);
}
