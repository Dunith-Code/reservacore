import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSessionUserId } from "@/lib/auth";
import { ForbiddenError } from "@/lib/services/reservations";

export async function getCurrentUser() {
  const id = await readSessionUserId();
  if (!id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required");
  return user;
}