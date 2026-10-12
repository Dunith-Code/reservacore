import { prisma } from "@/lib/db";

export type ResourceFilters = {
  q?: string;
  type?: string;
  status?: "active" | "inactive" | "all";
};

export async function listResources(f: ResourceFilters = {}) {
  const status = f.status ?? "active";
  const resources = await prisma.resource.findMany({
    where: {
      ...(f.q ? { name: { contains: f.q, mode: "insensitive" } } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const now = new Date();
  const busy = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { lte: now },
      endTime: { gt: now },
      resourceId: { in: resources.map((r) => r.id) },
    },
    select: { resourceId: true },
  });
  const busyIds = new Set(busy.map((b) => b.resourceId));

  return resources.map((r) => ({ ...r, inUseNow: busyIds.has(r.id) }));
}

export async function listResourceTypes() {
  const rows = await prisma.resource.findMany({
    distinct: ["type"],
    select: { type: true },
    orderBy: { type: "asc" },
  });
  return rows.map((r) => r.type);
}

export function getResource(id: string) {
  return prisma.resource.findUnique({ where: { id } });
}

export function getResourceDay(resourceId: string, ymd: string) {
  const dayStart = new Date(`${ymd}T00:00:00+05:30`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.reservation.findMany({
    where: {
      resourceId,
      status: "CONFIRMED",
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    include: { user: true },
    orderBy: { startTime: "asc" },
  });
}