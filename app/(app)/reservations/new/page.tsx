import { listResources } from "@/lib/services/resources";
import { BookingForm } from "@/components/booking-form";
import { toYmd } from "@/lib/format";

export const dynamic = "force-dynamic";

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v?: string) => !!v && /^\d{2}:\d{2}$/.test(v);

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceId?: string; date?: string; start?: string; end?: string; title?: string }>;
}) {
  const sp = await searchParams;
  const resources = await listResources({ status: "active" });

  const defaults = {
    resourceId: sp.resourceId ?? "",
    date: isDate(sp.date) ? sp.date! : toYmd(new Date()),
    start: isTime(sp.start) ? sp.start! : "",
    end: isTime(sp.end) ? sp.end! : "",
    title: (sp.title ?? "").slice(0, 120),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New booking</h1>
        <p className="text-sm text-muted-foreground">Reserve a room, equipment or vehicle</p>
      </div>
      <BookingForm
        key={`${defaults.resourceId}|${defaults.date}|${defaults.start}|${defaults.end}`}
        resources={resources.map((r) => ({ id: r.id, name: r.name, type: r.type }))}
        defaults={defaults}
      />
    </div>
  );
}