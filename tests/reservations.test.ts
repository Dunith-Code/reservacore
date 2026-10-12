import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  cancelReservation,
  createReservation,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/lib/services/reservations";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A time slot `dayOffset` days ahead, from `startHour` to `endHour` (UTC). */
function slot(startHour: number, endHour: number, dayOffset = 7) {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  const day = base.getTime() + dayOffset * DAY;
  return { startTime: new Date(day + startHour * HOUR), endTime: new Date(day + endHour * HOUR) };
}

let alice: { id: string; role: "USER" | "ADMIN" };
let bob: { id: string; role: "USER" | "ADMIN" };
let admin: { id: string; role: "USER" | "ADMIN" };
let roomId: string;
let otherRoomId: string;
let inactiveId: string;

beforeAll(async () => {
  const mkUser = (name: string, email: string, role: "USER" | "ADMIN") =>
    prisma.user.upsert({ where: { email }, update: { role }, create: { name, email, role } });
  const mkRes = (name: string, isActive = true) =>
    prisma.resource.upsert({
      where: { name },
      update: { isActive },
      create: { name, type: "Meeting Room", isActive },
    });

  alice = await mkUser("Alice", "alice@test.dev", "USER");
  bob = await mkUser("Bob", "bob@test.dev", "USER");
  admin = await mkUser("Admin", "admin@test.dev", "ADMIN");
  roomId = (await mkRes("Test Room")).id;
  otherRoomId = (await mkRes("Other Room")).id;
  inactiveId = (await mkRes("Retired Room", false)).id;
});

beforeEach(async () => {
  await prisma.reservation.deleteMany();
});

afterAll(async () => {
  await prisma.reservation.deleteMany();
  await prisma.$disconnect();
});

const book = (resourceId: string, s: number, e: number, userId = alice.id, day = 7) =>
  createReservation({ resourceId, title: "Test booking", ...slot(s, e, day) }, userId);

describe("conflict prevention", () => {
  it("creates a valid reservation", async () => {
    const r = await book(roomId, 9, 10);
    expect(r.status).toBe("CONFIRMED");
  });

  it.each([
    ["exact same slot", 9, 11],
    ["starts inside existing", 10, 12],
    ["ends inside existing", 8, 10],
    ["fully contained", 9.5, 10.5],
    ["fully contains existing", 8, 12],
  ])("rejects overlap: %s", async (_label, s, e) => {
    await book(roomId, 9, 11);
    await expect(book(roomId, s, e, bob.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows back-to-back bookings (end == next start)", async () => {
    await book(roomId, 9, 10);
    await expect(book(roomId, 10, 11, bob.id)).resolves.toBeTruthy();
    await expect(book(roomId, 8, 9, bob.id)).resolves.toBeTruthy();
  });

  it("allows the same time on a different resource", async () => {
    await book(roomId, 9, 10);
    await expect(book(otherRoomId, 9, 10, bob.id)).resolves.toBeTruthy();
  });

  it("frees the slot once a reservation is cancelled", async () => {
    const first = await book(roomId, 9, 10);
    await cancelReservation(first.id, alice);
    await expect(book(roomId, 9, 10, bob.id)).resolves.toBeTruthy();
  });

  it("names the clashing booking in the error message", async () => {
    await book(roomId, 9, 11);
    await expect(book(roomId, 10, 12, bob.id)).rejects.toThrow(/already booked/);
  });
});

describe("validation rules", () => {
  it("rejects end before start", async () => {
    await expect(book(roomId, 11, 10)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects zero-length bookings", async () => {
    await expect(book(roomId, 10, 10)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects bookings in the past", async () => {
    await expect(book(roomId, 9, 10, alice.id, -1)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects inactive resources", async () => {
    await expect(book(inactiveId, 9, 10)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("database-level enforcement (bypassing the service)", () => {
  it("rejects an overlapping insert even without the app-level logic", async () => {
    await book(roomId, 9, 11);
    await expect(
      prisma.reservation.create({
        data: { resourceId: roomId, userId: bob.id, title: "Sneaky", ...slot(10, 12) },
      })
    ).rejects.toThrow();
  });

  it("rejects an invalid time range via the CHECK constraint", async () => {
    await expect(
      prisma.reservation.create({
        data: { resourceId: roomId, userId: bob.id, title: "Backwards", ...slot(12, 10) },
      })
    ).rejects.toThrow();
  });
});

describe("concurrency", () => {
  it("lets exactly one of many simultaneous requests win the same slot", async () => {
    const attempts = Array.from({ length: 8 }, (_, i) =>
      createReservation(
        { resourceId: roomId, title: `Race ${i}`, ...slot(9, 10) },
        i % 2 === 0 ? alice.id : bob.id
      )
    );
    const results = await Promise.allSettled(attempts);

    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");

    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(7);
    for (const l of lost) expect((l as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

    const rows = await prisma.reservation.count({
      where: { resourceId: roomId, status: "CONFIRMED" },
    });
    expect(rows).toBe(1);
  });
});

describe("cancellation permissions", () => {
  it("lets the owner cancel", async () => {
    const r = await book(roomId, 9, 10);
    const res = await cancelReservation(r.id, alice);
    expect(res.status).toBe("CANCELLED");
  });

  it("blocks other users from cancelling", async () => {
    const r = await book(roomId, 9, 10);
    await expect(cancelReservation(r.id, bob)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lets an admin cancel anyone's reservation", async () => {
    const r = await book(roomId, 9, 10);
    const res = await cancelReservation(r.id, admin);
    expect(res.status).toBe("CANCELLED");
  });
});

  it("suggests free slots and other free resources when there is a conflict", async () => {
    await book(roomId, 9, 11);
    const err = await book(roomId, 9, 10, bob.id).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    const s = (err as ConflictError).suggestions!;
    expect(s.slots.length).toBeGreaterThan(0);
    expect(s.resources.map((r) => r.name)).toContain("Other Room");
  });