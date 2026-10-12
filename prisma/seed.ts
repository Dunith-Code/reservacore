import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// hour on the day `days` from today
const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  const users = await Promise.all(
    [
      { name: "Admin User", email: "admin@reservacore.dev", role: "ADMIN" as const },
      { name: "Nimal Perera", email: "nimal@reservacore.dev", role: "USER" as const },
      { name: "Sara Fernando", email: "sara@reservacore.dev", role: "USER" as const },
    ].map((u) => prisma.user.upsert({ where: { email: u.email }, update: u, create: u }))
  );

  const resourceData = [
    { name: "Boardroom A", type: "Meeting Room", location: "Floor 3", capacity: 12 },
    { name: "Huddle Room 1", type: "Meeting Room", location: "Floor 2", capacity: 4 },
    { name: "Training Hall", type: "Meeting Room", location: "Floor 1", capacity: 40 },
    { name: "Projector P-100", type: "Equipment", location: "IT Store" },
    { name: "Company Van", type: "Vehicle", location: "Basement Parking", capacity: 8 },
    { name: "Old Conference Room", type: "Meeting Room", location: "Floor 4", isActive: false },
  ];
  const resources = await Promise.all(
    resourceData.map((r) => prisma.resource.upsert({ where: { name: r.name }, update: r, create: r }))
  );
  const byName = Object.fromEntries(resources.map((r) => [r.name, r.id]));

  await prisma.reservation.deleteMany();
  await prisma.reservation.createMany({
    data: [
      { resourceId: byName["Boardroom A"], userId: users[1].id, title: "Sprint planning", startTime: at(0, 14), endTime: at(0, 16) },
      { resourceId: byName["Boardroom A"], userId: users[2].id, title: "Client review", startTime: at(1, 9), endTime: at(1, 11) },
      { resourceId: byName["Huddle Room 1"], userId: users[2].id, title: "1:1 catch-up", startTime: at(1, 10), endTime: at(1, 11) },
      { resourceId: byName["Projector P-100"], userId: users[1].id, title: "Team demo", startTime: at(2, 13), endTime: at(2, 15) },
      { resourceId: byName["Company Van"], userId: users[0].id, title: "Site visit", startTime: at(3, 8), endTime: at(3, 17) },
      { resourceId: byName["Training Hall"], userId: users[1].id, title: "Onboarding session", startTime: at(-2, 10), endTime: at(-2, 12) },
      { resourceId: byName["Boardroom A"], userId: users[1].id, title: "Cancelled workshop", startTime: at(1, 9), endTime: at(1, 10), status: "CANCELLED" },
    ],
  });
  console.log("Seeded.");
}

main().finally(() => prisma.$disconnect());