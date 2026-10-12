import Link from "next/link";
import { Boxes, CalendarCheck, CalendarClock, CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();

  const stats = [
    { label: "Total resources", value: d.totalResources, hint: "Active and bookable", icon: Boxes },
    { label: "Today's bookings", value: d.todaysBookings, hint: "Across all resources", icon: CalendarCheck },
    { label: "Available now", value: d.availableNow, hint: "Free right now", icon: CircleCheck },
    { label: "Upcoming", value: d.upcomingCount, hint: "Future reservations", icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of resources and reservations</p>
        </div>
        <Button asChild>
          <Link href="/reservations/new">New booking</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{value}</div>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming reservations</CardTitle>
          <Link href="/reservations" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {d.upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No upcoming reservations. Create one to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {d.upcoming.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.resource.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {r.title} · {r.user.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatRange(r.startTime, r.endTime)}
                    </span>
                    <StatusBadge status={r.status} startTime={r.startTime} endTime={r.endTime} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}