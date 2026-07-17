import type { ReactNode } from "react";

type AuthFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message?: ReactNode;
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ action, message, mode }: AuthFormProps) {
  const isSignIn = mode === "sign-in";

  return (
    <main className="auth-page">
      <section aria-labelledby="auth-heading" className="auth-card">
        <p className="eyebrow">Evidence-first research</p>
        <h1 id="auth-heading">
          {isSignIn ? "Sign in to CaseLab" : "Create your CaseLab account"}
        </h1>
        <p className="lede">
          {isSignIn
            ? "Return to the research that can be traced to real evidence."
            : "Start a private workspace for evidence-first qualitative research."}
        </p>
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <form action={action} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input autoComplete="email" id="email" name="email" required type="email" />
          <label htmlFor="password">Password</label>
          <input
            autoComplete={isSignIn ? "current-password" : "new-password"}
            id="password"
            minLength={12}
            name="password"
            required
            type="password"
          />
          <button type="submit">{isSignIn ? "Sign in" : "Create account"}</button>
        </form>
        <p className="auth-switch">
          {isSignIn ? "New to CaseLab? " : "Already have an account? "}
          <a href={isSignIn ? "/sign-up" : "/sign-in"}>
            {isSignIn ? "Create an account" : "Sign in"}
          </a>
        </p>
      </section>
    </main>
  );
}
