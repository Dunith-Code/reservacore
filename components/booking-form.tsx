"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReservationAction, type BookingState } from "@/app/actions/reservations";

type Props = {
  resources: { id: string; name: string; type: string }[];
  defaults: { resourceId: string; date: string; start: string; end: string; title: string };
};

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm";
const chipCls = "rounded-md border bg-background px-2.5 py-1 text-sm hover:bg-muted";
const href = (params: Record<string, string>) => `/reservations/new?${new URLSearchParams(params)}`;

export function BookingForm({ resources, defaults }: Props) {
  const [state, formAction, pending] = useActionState(createReservationAction, {} as BookingState);
  const v = state.values;
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const s = state.suggestions;
  const hasSuggestions = !!s && (s.slots.length > 0 || s.resources.length > 0);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error && (
        <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{state.error}</p>
        </div>
      )}

      {hasSuggestions && v && (
        <div className="space-y-3 rounded-md border bg-accent/60 p-3 text-sm">
          {s.slots.length > 0 && (
            <div>
              <p className="font-medium">Free on this resource the same day:</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {s.slots.map((slot) => (
                  <Link
                    key={slot.start}
                    className={chipCls}
                    href={href({ resourceId: v.resourceId, date: slot.date, start: slot.start, end: slot.end, title: v.title })}
                  >
                    {slot.start} – {slot.end}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {s.resources.length > 0 && (
            <div>
              <p className="font-medium">Or the same time on another {`resource of this type`}:</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {s.resources.map((r) => (
                  <Link
                    key={r.id}
                    className={chipCls}
                    href={href({ resourceId: r.id, date: v.date, start: v.start, end: v.end, title: v.title })}
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Pick an option to pre-fill the form, then confirm.</p>
        </div>
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
        <Input id="title" name="title" defaultValue={v?.title ?? defaults.title}
          placeholder="e.g. Sprint planning" required />
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
          <Input id="start" name="start" type="time" step={900} defaultValue={v?.start ?? defaults.start} required />
          {err("start") && <p className="text-xs text-red-600">{err("start")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">End</Label>
          <Input id="end" name="end" type="time" step={900} defaultValue={v?.end ?? defaults.end} required />
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