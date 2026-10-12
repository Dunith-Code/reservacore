import { redirect } from "next/navigation";
import { readSessionUserId } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await readSessionUserId()) redirect("/dashboard");

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
            R
          </div>
          <h1 className="text-xl font-semibold">Sign in to ReservaCore</h1>
          <p className="text-sm text-muted-foreground">Reserve shared rooms, equipment and vehicles</p>
        </div>
        <LoginForm />
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Demo accounts (password: Demo@1234)</p>
          <p>admin@reservacore.dev (admin)</p>
          <p>nimal@reservacore.dev</p>
          <p>sara@reservacore.dev</p>
        </div>
      </div>
    </main>
  );
}