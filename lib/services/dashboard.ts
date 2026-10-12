import { prisma } from "@/lib/db";
import { todayBounds } from "@/lib/format";

export async function getDashboardData() {
  const now = new Date();
  const { start, end } = todayBounds(now);

  const [totalResources, todaysBookings, upcomingCount, busyNow, upcoming] =
    await Promise.all([
      prisma.resource.count({ where: { isActive: true } }),
      prisma.reservation.count({
        where: { status: "CONFIRMED", startTime: { lt: end }, endTime: { gt: start } },
      }),
      prisma.reservation.count({
        where: { status: "CONFIRMED", startTime: { gt: now } },
      }),
      prisma.reservation.findMany({
        where: {
          status: "CONFIRMED",
          startTime: { lte: now },
          endTime: { gt: now },
          resource: { isActive: true },
        },
        select: { resourceId: true },
        distinct: ["resourceId"],
      }),
      prisma.reservation.findMany({
        where: { status: "CONFIRMED", endTime: { gte: now } },
        include: { resource: true, user: true },
        orderBy: { startTime: "asc" },
        take: 6,
      }),
    ]);

  return {
    totalResources,
    todaysBookings,
    upcomingCount,
    availableNow: totalResources - busyNow.length,
    upcoming,
  };
}