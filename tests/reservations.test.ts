import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  cancelReservation,
  createReservation,
  rescheduleReservation,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/lib/services/reservations";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// A dedicated type keeps these tests independent of any other resources in the database.
const TEST_TYPE = "Unit Test Room";

/** A time slot `dayOffset` days ahead, from `startHour` to `endHour` (UTC). Sri Lanka time is UTC+5:30. */
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
      update: { isActive, type: TEST_TYPE },
      create: { name, type: TEST_TYPE, isActive },
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

  it("suggests free slots and other free resources when there is a conflict", async () => {
    await book(roomId, 9, 11);
    const err = await book(roomId, 9, 10, bob.id).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    const s = (err as ConflictError).suggestions!;
    expect(s.slots.length).toBeGreaterThan(0);
    expect(s.resources.map((r) => r.name)).toContain("Other Room");
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

describe("booking rules", () => {
  it("rejects bookings longer than the maximum duration", async () => {
    await expect(book(roomId, 1, 11)).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts a booking exactly at the maximum duration", async () => {
    await expect(book(roomId, 1, 9)).resolves.toBeTruthy();
  });

  it("rejects bookings that start before opening time", async () => {
    await expect(book(roomId, 0, 1)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects bookings that end after closing time", async () => {
    await expect(book(roomId, 16, 17)).rejects.toBeInstanceOf(ValidationError);
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

describe("rescheduling", () => {
  it("moves a booking to a free slot", async () => {
    const r = await book(roomId, 9, 10);
    const updated = await rescheduleReservation(r.id, alice, slot(11, 12));
    expect(updated.startTime).toEqual(slot(11, 12).startTime);
  });

  it("lets a booking overlap its own previous time", async () => {
    const r = await book(roomId, 9, 11);
    await expect(rescheduleReservation(r.id, alice, slot(10, 12))).resolves.toBeTruthy();
  });

  it("rejects moving onto another booking, with suggestions", async () => {
    await book(roomId, 9, 11, bob.id);
    const r = await book(roomId, 12, 13);
    const err = await rescheduleReservation(r.id, alice, slot(10, 12)).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).suggestions!.slots.length).toBeGreaterThan(0);
  });

  it("blocks other users but allows an admin", async () => {
    const r = await book(roomId, 9, 10);
    await expect(rescheduleReservation(r.id, bob, slot(11, 12))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(rescheduleReservation(r.id, admin, slot(11, 12))).resolves.toBeTruthy();
  });

  it("rejects changing a cancelled booking", async () => {
    const r = await book(roomId, 9, 10);
    await cancelReservation(r.id, alice);
    await expect(rescheduleReservation(r.id, alice, slot(11, 12))).rejects.toBeInstanceOf(ValidationError);
  });

  it("applies the same booking rules when rescheduling", async () => {
    const r = await book(roomId, 9, 10);
    await expect(rescheduleReservation(r.id, alice, slot(1, 11))).rejects.toBeInstanceOf(ValidationError);
  });
});