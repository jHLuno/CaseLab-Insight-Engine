import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "../actions";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const messages: Record<string, string> = {
  invalid_credentials: "Enter a valid email and a password of at least 12 characters.",
  sign_up_failed: "We could not create an account with those details.",
  workspace_unavailable: "Your account is created, but your workspace is not ready yet. Please try again."
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  return <AuthForm action={signUpAction} message={params.error ? messages[params.error] : undefined} mode="sign-up" />;
}
