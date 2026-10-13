"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleReservationAction, type RescheduleState } from "@/app/actions/reservations";
import { BOOKING_RULES, CLOSE_TIME, OPEN_TIME } from "@/lib/rules";

type Props = {
  reservationId: string;
  defaults: { date: string; start: string; end: string };
};

const chipCls = "rounded-md border bg-background px-2.5 py-1 text-sm hover:bg-muted";

export function RescheduleForm({ reservationId, defaults }: Props) {
  const [state, formAction, pending] = useActionState(
    rescheduleReservationAction.bind(null, reservationId),
    {} as RescheduleState
  );
  const v = state.values;
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const slots = state.suggestions?.slots ?? [];

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {slots.length > 0 && (
        <div className="space-y-2 rounded-md border bg-accent/60 p-3 text-sm">
          <p className="font-medium">Free on this resource the same day:</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Link
                key={s.start}
                className={chipCls}
                href={`/reservations/${reservationId}/edit?${new URLSearchParams({ date: s.date, start: s.start, end: s.end })}`}
              >
                {s.start} – {s.end}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Pick an option to pre-fill the form, then save.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={v?.date ?? defaults.date} required />
          {err("date") && <p className="text-xs text-red-600">{err("date")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start">Start</Label>
          <Input id="start" name="start" type="time" step={900} min={OPEN_TIME} max={CLOSE_TIME}
            defaultValue={v?.start ?? defaults.start} required />
          {err("start") && <p className="text-xs text-red-600">{err("start")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">End</Label>
          <Input id="end" name="end" type="time" step={900} min={OPEN_TIME} max={CLOSE_TIME}
            defaultValue={v?.end ?? defaults.end} required />
          {err("end") && <p className="text-xs text-red-600">{err("end")}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Times are in Sri Lanka time. Bookings run {OPEN_TIME}–{CLOSE_TIME} and last up to{" "}
        {BOOKING_RULES.maxDurationHours} hours.
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        <Button variant="outline" asChild><Link href="/reservations">Cancel</Link></Button>
      </div>
    </form>
  );
}