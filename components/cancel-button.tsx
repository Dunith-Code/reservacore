"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelReservationAction } from "@/app/actions/reservations";

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700"
        disabled={pending}
        onClick={() => {
          if (!confirm("Cancel this reservation? The time slot will become available again.")) return;
          startTransition(async () => {
            const res = await cancelReservationAction(id);
            setError(res.error);
          });
        }}
      >
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}