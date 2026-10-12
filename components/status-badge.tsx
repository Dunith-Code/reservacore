import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = { status: "CONFIRMED" | "CANCELLED"; startTime: Date; endTime: Date };

export function StatusBadge({ status, startTime, endTime }: Props) {
  const now = new Date();
  let label = "Upcoming";
  let tone = "bg-emerald-100 text-emerald-700";

  if (status === "CANCELLED") { label = "Cancelled"; tone = "bg-red-100 text-red-700"; }
  else if (endTime < now) { label = "Completed"; tone = "bg-slate-100 text-slate-600"; }
  else if (startTime <= now) { label = "In progress"; tone = "bg-amber-100 text-amber-700"; }

  return <Badge variant="outline" className={cn("border-transparent", tone)}>{label}</Badge>;
}