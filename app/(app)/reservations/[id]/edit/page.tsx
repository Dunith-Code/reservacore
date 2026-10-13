import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { RescheduleForm } from "@/components/reschedule-form";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, toYmd } from "@/lib/format";

export const dynamic = "force-dynamic";

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v?: string) => !!v && /^\d{2}:\d{2}$/.test(v);

export default async function RescheduleReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; start?: string; end?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [user, r] = await Promise.all([
    getCurrentUser(),
    prisma.reservation.findUnique({ where: { id }, include: { resource: true } }),
  ]);
  if (!r) notFound();

  const canEdit =
    r.status === "CONFIRMED" && r.endTime > new Date() && (r.userId === user.id || user.role === "ADMIN");
  if (!canEdit) redirect("/reservations");

  const defaults = {
    date: isDate(sp.date) ? sp.date! : toYmd(r.startTime),
    start: isTime(sp.start) ? sp.start! : formatTime(r.startTime),
    end: isTime(sp.end) ? sp.end! : formatTime(r.endTime),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reschedule booking</h1>
        <p className="text-sm text-muted-foreground">Choose a new date and time</p>
      </div>

      <Card className="max-w-xl">
        <CardContent className="space-y-1 pt-6 text-sm">
          <div className="font-medium">{r.resource.name}</div>
          <div className="text-muted-foreground">{r.title}</div>
          <div>
            Currently: {formatDate(r.startTime)}, {formatTime(r.startTime)} – {formatTime(r.endTime)}
          </div>
        </CardContent>
      </Card>

      <RescheduleForm
        key={`${defaults.date}|${defaults.start}|${defaults.end}`}
        reservationId={r.id}
        defaults={defaults}
      />
    </div>
  );
}