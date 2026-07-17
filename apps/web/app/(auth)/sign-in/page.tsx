import { AuthForm } from "@/components/auth-form";
import { signInAction } from "../actions";

type SignInPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

const messages: Record<string, string> = {
  check_email: "Check your email to confirm your account, then sign in.",
  invalid_credentials: "Enter a valid email and a password of at least 12 characters.",
  sign_in_failed: "We could not sign you in with those details.",
  workspace_unavailable: "Your account is signed in, but your workspace is not ready yet. Please try again."
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const message = params.error ? messages[params.error] : params.message ? messages[params.message] : undefined;

  return <AuthForm action={signInAction} message={message} mode="sign-in" />;
}
