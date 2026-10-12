import { Prisma, ReservationStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateInput } from "@/lib/validators";
import { formatDate, formatTime, toYmd } from "@/lib/format";

export type Suggestions = {
  slots: { date: string; start: string; end: string }[];
  resources: { id: string; name: string }[];
};

export class ConflictError extends Error {
  suggestions?: Suggestions;
  constructor(message: string, suggestions?: Suggestions) {
    super(message);
    this.name = "ConflictError";
    this.suggestions = suggestions;
  }
}
export class ValidationError extends Error {}
export class ForbiddenError extends Error {}

type Actor = { id: string; role: Role };

const STEP_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_FROM_H = 6;  // suggestions are limited to 06:00-22:00 Sri Lanka time
const WINDOW_TO_H = 22;

/** Nearest free slots (same duration) on this resource that day, plus other free resources of the same type. */
export async function suggestAlternatives(
  resource: { id: string; type: string },
  startTime: Date,
  endTime: Date
): Promise<Suggestions> {
  const duration = endTime.getTime() - startTime.getTime();
  const date = toYmd(startTime);
  const dayStart = new Date(`${date}T00:00:00+05:30`).getTime();
  const windowStart = dayStart + WINDOW_FROM_H * HOUR_MS;
  const windowEnd = dayStart + WINDOW_TO_H * HOUR_MS;
  const now = Date.now();

  const [busy, others] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        resourceId: resource.id,
        status: "CONFIRMED",
        startTime: { lt: new Date(windowEnd) },
        endTime: { gt: new Date(windowStart) },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.resource.findMany({
      where: {
        type: resource.type,
        isActive: true,
        id: { not: resource.id },
        reservations: {
          none: { status: "CONFIRMED", startTime: { lt: endTime }, endTime: { gt: startTime } },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 3,
    }),
  ]);

  const isFree = (s: number, e: number) =>
    !busy.some((b) => b.startTime.getTime() < e && b.endTime.getTime() > s);

  const candidates: { start: number; dist: number }[] = [];
  for (let s = windowStart; s + duration <= windowEnd; s += STEP_MS) {
    if (s > now && isFree(s, s + duration)) {
      candidates.push({ start: s, dist: Math.abs(s - startTime.getTime()) });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);

  // Up to 3 nearest options, spaced at least one booking-length apart so they are genuinely different.
  const picked: number[] = [];
  for (const c of candidates) {
    if (picked.every((p) => Math.abs(p - c.start) >= duration)) picked.push(c.start);
    if (picked.length === 3) break;
  }
  picked.sort((a, b) => a - b);

  return {
    slots: picked.map((s) => ({
      date,
      start: formatTime(new Date(s)),
      end: formatTime(new Date(s + duration)),
    })),
    resources: others,
  };
}

export async function createReservation(input: CreateInput, userId: string) {
  const { resourceId, title, startTime, endTime } = input;
  if (endTime <= startTime) throw new ValidationError("End time must be after start time");
  if (startTime < new Date()) throw new ValidationError("Cannot book in the past");

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource || !resource.isActive)
    throw new ValidationError("Resource is not available for booking");

  try {
    return await prisma.reservation.create({
      data: { resourceId, userId, title, startTime, endTime },
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("no_overlapping_reservations") || msg.includes("23P01")) {
      const clash = await prisma.reservation.findFirst({
        where: {
          resourceId,
          status: "CONFIRMED",
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        orderBy: { startTime: "asc" },
      });
      const message = clash
        ? `${resource.name} is already booked ${formatTime(clash.startTime)}–${formatTime(clash.endTime)} on ${formatDate(clash.startTime)}.`
        : `${resource.name} is already booked during that time.`;
      throw new ConflictError(message, await suggestAlternatives(resource, startTime, endTime));
    }
    throw e;
  }
}

export async function cancelReservation(id: string, actor: Actor) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw new ValidationError("Reservation not found");
  if (reservation.userId !== actor.id && actor.role !== "ADMIN")
    throw new ForbiddenError("You can only cancel your own reservations");
  if (reservation.status === "CANCELLED") return reservation;

  return prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
}

export type ReservationFilters = {
  resourceId?: string;
  userId?: string;
  status?: ReservationStatus;
  date?: string; // YYYY-MM-DD in Sri Lanka time
  scope?: "upcoming" | "past";
};

export async function listReservations(f: ReservationFilters = {}) {
  const and: Prisma.ReservationWhereInput[] = [];
  if (f.resourceId) and.push({ resourceId: f.resourceId });
  if (f.userId) and.push({ userId: f.userId });
  if (f.status) and.push({ status: f.status });
  if (f.date) {
    const dayStart = new Date(`${f.date}T00:00:00+05:30`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    and.push({ startTime: { lt: dayEnd }, endTime: { gt: dayStart } });
  }
  const now = new Date();
  if (f.scope === "upcoming") and.push({ endTime: { gte: now } });
  if (f.scope === "past") and.push({ endTime: { lt: now } });

  return prisma.reservation.findMany({
    where: { AND: and },
    include: { resource: true, user: true },
    orderBy: { startTime: f.scope === "past" ? "desc" : "asc" },
  });
}