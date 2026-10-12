import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/current-user";
import { getResource, getResourceDay } from "@/lib/services/resources";
import { setResourceActive } from "@/app/actions/resources";
import { formatTime, toYmd } from "@/lib/format";

export const dynamic = "force-dynamic";

const FROM = 6 * 60;   // timeline starts 06:00
const TO = 22 * 60;    // ends 22:00

export default async function ResourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toYmd(new Date());

  const [user, resource, bookings] = await Promise.all([
    getCurrentUser(), getResource(id), getResourceDay(id, date),
  ]);
  if (!resource) notFound();
  const isAdmin = user.role === "ADMIN";

  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const pos = (d: Date) => {
    const m = (d.getTime() - dayStart.getTime()) / 60000;
    return Math.min(Math.max((m - FROM) / (TO - FROM), 0), 1) * 100;
  };
  const hours = Array.from({ length: (TO - FROM) / 120 + 1 }, (_, i) => FROM / 60 + i * 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{resource.name}</h1>
            {!resource.isActive && (
              <Badge variant="outline" className="border-transparent bg-slate-100 text-slate-600">Inactive</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">{resource.type}</Badge>
            {resource.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{resource.location}</span>}
            {resource.capacity && <span className="flex items-center gap-1"><Users className="size-3.5" />Capacity {resource.capacity}</span>}
          </div>
          {resource.description && <p className="max-w-2xl text-sm">{resource.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {resource.isActive && (
            <Button asChild>
              <Link href={`/reservations/new?resourceId=${resource.id}&date=${date}`}>Book this resource</Link>
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" asChild><Link href={`/resources/${resource.id}/edit`}>Edit</Link></Button>
              <form action={setResourceActive.bind(null, resource.id, !resource.isActive)}>
                <Button variant="outline" type="submit">
                  {resource.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Availability</CardTitle>
          <form className="flex items-center gap-2">
            <Input type="date" name="date" defaultValue={date} className="w-40" />
            <Button type="submit" variant="secondary" size="sm">Go</Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="relative h-10 overflow-hidden rounded-md border bg-emerald-50">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  title={`${b.title} (${formatTime(b.startTime)}–${formatTime(b.endTime)})`}
                  className="absolute inset-y-0 bg-primary/80"
                  style={{ left: `${pos(b.startTime)}%`, width: `${Math.max(pos(b.endTime) - pos(b.startTime), 0.5)}%` }}
                />
              ))}
            </div>
            <div className="relative mt-1 h-4 text-[11px] text-muted-foreground">
              {hours.map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h * 60 - FROM) / (TO - FROM)) * 100}%` }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Violet = booked. Green = free. Times shown in Sri Lanka time.
            </p>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings on this day. Fully available.</p>
          ) : (
            <ul className="divide-y">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{formatTime(b.startTime)} – {formatTime(b.endTime)}</span>
                  <span className="text-muted-foreground">{b.title} · {b.user.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}