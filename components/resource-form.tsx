"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/app/actions/resources";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  types: string[];
  cancelHref: string;
  submitLabel: string;
  defaults?: {
    name?: string; type?: string; location?: string | null;
    description?: string | null; capacity?: number | null;
  };
};

const SUGGESTED = ["Meeting Room", "Equipment", "Vehicle"];

export function ResourceForm({ action, types, cancelHref, submitLabel, defaults = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  const allTypes = Array.from(new Set([...SUGGESTED, ...types]));

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        {err("name") && <p className="text-xs text-red-600">{err("name")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Input id="type" name="type" list="type-options" defaultValue={defaults.type} required />
        <datalist id="type-options">
          {allTypes.map((t) => <option key={t} value={t} />)}
        </datalist>
        {err("type") && <p className="text-xs text-red-600">{err("type")}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={defaults.location ?? ""} />
          {err("location") && <p className="text-xs text-red-600">{err("location")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={defaults.capacity ?? ""} />
          {err("capacity") && <p className="text-xs text-red-600">{err("capacity")}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} />
        {err("description") && <p className="text-xs text-red-600">{err("description")}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}