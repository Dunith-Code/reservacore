import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { NavLinks } from "@/components/nav-links";
import { UserSwitcher } from "@/components/user-switcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, users] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="bg-[#111827] p-4 text-white md:min-h-screen">
        <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold">
            R
          </span>
          ReservaCore
        </div>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end border-b bg-card px-4 py-3">
          <UserSwitcher users={users} currentId={user.id} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}