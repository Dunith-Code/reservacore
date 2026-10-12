import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/services/reservations";

export const USER_COOKIE = "rc_user";

export async function getCurrentUser() {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  }
  // Fallback: first admin (enum order puts ADMIN first)
  const fallback = await prisma.user.findFirst({ orderBy: { role: "asc" } });
  if (!fallback) throw new Error("No users found. Run `npm run db:seed`.");
  return fallback;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required");
  return user;
}