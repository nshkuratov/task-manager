import { LoginForm, type SignInAction } from "./login-form";

export function LoginCard({ signIn }: { signIn: SignInAction }) {
  return (
    <div className="grid gap-4 rounded-3xl border bg-card/80 p-[calc(1.5rem+10px)] text-card-foreground shadow-[0_16px_48px_-16px_color-mix(in_oklab,var(--foreground)_18%,transparent)] backdrop-blur-xl sm:p-[calc(1.75rem+10px)]">
      <div className="grid gap-1.5">
        <h1 className="text-3xl font-normal tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Use your account email and password.</p>
      </div>
      <LoginForm signIn={signIn} />
    </div>
  );
}
