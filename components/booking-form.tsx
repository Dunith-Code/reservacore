"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReservationAction, type BookingState } from "@/app/actions/reservations";

type Props = {
  resources: { id: string; name: string; type: string }[];
  defaults: { resourceId: string; date: string };
};

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export function BookingForm({ resources, defaults }: Props) {
  const [state, formAction, pending] = useActionState(createReservationAction, {} as BookingState);
  const v = state.values;
  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="resourceId">Resource</Label>
        <select id="resourceId" name="resourceId" className={selectCls}
          defaultValue={v?.resourceId ?? defaults.resourceId} required>
          <option value="" disabled>Select a resource…</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
          ))}
        </select>
        {err("resourceId") && <p className="text-xs text-red-600">{err("resourceId")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Purpose</Label>
        <Input id="title" name="title" defaultValue={v?.title} placeholder="e.g. Sprint planning" required />
        {err("title") && <p className="text-xs text-red-600">{err("title")}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={v?.date ?? defaults.date} required />
          {err("date") && <p className="text-xs text-red-600">{err("date")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start">Start</Label>
          <Input id="start" name="start" type="time" step={900} defaultValue={v?.start} required />
          {err("start") && <p className="text-xs text-red-600">{err("start")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">End</Label>
          <Input id="end" name="end" type="time" step={900} defaultValue={v?.end} required />
          {err("end") && <p className="text-xs text-red-600">{err("end")}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Times are in Sri Lanka time.</p>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Booking…" : "Confirm booking"}</Button>
        <Button variant="outline" asChild><Link href="/reservations">Cancel</Link></Button>
      </div>
    </form>
  );
}