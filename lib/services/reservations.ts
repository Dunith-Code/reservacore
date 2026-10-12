import { Prisma, ReservationStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateInput } from "@/lib/validators";

export class ConflictError extends Error {}
export class ValidationError extends Error {}
export class ForbiddenError extends Error {}

type Actor = { id: string; role: Role };

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
    if (msg.includes("no_overlapping_reservations") || msg.includes("23P01"))
      throw new ConflictError("This resource is already booked during that time");
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
  status?: ReservationStatus;
  date?: string; // YYYY-MM-DD in Sri Lanka time
  scope?: "upcoming" | "past";
};

export async function listReservations(f: ReservationFilters = {}) {
  const and: Prisma.ReservationWhereInput[] = [];
  if (f.resourceId) and.push({ resourceId: f.resourceId });
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