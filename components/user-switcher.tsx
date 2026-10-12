"use client";

import { useTransition } from "react";
import { switchUser } from "@/app/actions/user";

type U = { id: string; name: string; role: string };

export function UserSwitcher({ users, currentId }: { users: U[]; currentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground hidden sm:inline">Acting as</span>
      <select
        className="rounded-md border bg-background px-2 py-1.5 text-sm"
        value={currentId}
        disabled={pending}
        onChange={(e) => startTransition(() => switchUser(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role.toLowerCase()})
          </option>
        ))}
      </select>
    </label>
  );
}