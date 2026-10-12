import { listResources } from "@/lib/services/resources";
import { BookingForm } from "@/components/booking-form";
import { toYmd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceId?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const resources = await listResources({ status: "active" });
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toYmd(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New booking</h1>
        <p className="text-sm text-muted-foreground">Reserve a room, equipment or vehicle</p>
      </div>
      <BookingForm
        resources={resources.map((r) => ({ id: r.id, name: r.name, type: r.type }))}
        defaults={{ resourceId: sp.resourceId ?? "", date }}
      />
    </div>
  );
}