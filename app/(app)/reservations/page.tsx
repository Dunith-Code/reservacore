import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { CancelButton } from "@/components/cancel-button";
import { getCurrentUser } from "@/lib/current-user";
import { listReservations } from "@/lib/services/reservations";
import { listResources } from "@/lib/services/resources";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const selectCls = "h-9 rounded-md border bg-background px-3 text-sm";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string; resourceId?: string; date?: string;
    status?: string; mine?: string; created?: string;
  }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope === "past" || sp.scope === "all" ? sp.scope : "upcoming";
  const status = sp.status === "CONFIRMED" || sp.status === "CANCELLED" ? sp.status : undefined;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;

  const user = await getCurrentUser();
  const [resources, reservations] = await Promise.all([
    listResources({ status: "all" }),
    listReservations({
      scope: scope === "all" ? undefined : scope,
      resourceId: sp.resourceId || undefined,
      status,
      date,
      userId: sp.mine === "1" ? user.id : undefined,
    }),
  ]);

  const now = new Date();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">View, filter and cancel bookings</p>
        </div>
        <Button asChild>
          <Link href="/reservations/new"><Plus className="size-4" /> New booking</Link>
        </Button>
      </div>

      {sp.created === "1" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Reservation confirmed.
        </p>
      )}

      <form className="flex flex-wrap items-center gap-2">
        <select name="scope" defaultValue={scope} className={selectCls}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
        <select name="resourceId" defaultValue={sp.resourceId ?? ""} className={selectCls}>
          <option value="">All resources</option>
          {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Input type="date" name="date" defaultValue={date} className="w-40" />
        <select name="status" defaultValue={status ?? ""} className={selectCls}>
          <option value="">Any status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} />
          My bookings
        </label>
        <Button type="submit" variant="secondary">Filter</Button>
        <Button type="button" variant="ghost" asChild><Link href="/reservations">Reset</Link></Button>
      </form>

      {reservations.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No reservations match your filters.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Booked by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => {
                  const canCancel =
                    r.status === "CONFIRMED" && r.endTime > now && (r.userId === user.id || isAdmin);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link href={`/resources/${r.resourceId}`} className="hover:underline">
                          {r.resource.name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(r.startTime)}, {formatTime(r.startTime)} – {formatTime(r.endTime)}
                      </TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.user.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} startTime={r.startTime} endTime={r.endTime} />
                      </TableCell>
                      <TableCell>{canCancel && <CancelButton id={r.id} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}