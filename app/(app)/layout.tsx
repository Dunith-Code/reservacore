import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { logoutAction } from "@/app/actions/auth";
import { NavLinks } from "@/components/nav-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="bg-[#111827] p-4 text-white md:min-h-screen">
        <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold">R</span>
          ReservaCore
        </div>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-3 border-b bg-card px-4 py-3">
          <div className="text-right text-sm leading-tight">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <Badge variant="secondary">{user.role === "ADMIN" ? "Admin" : "Member"}</Badge>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" /> Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}