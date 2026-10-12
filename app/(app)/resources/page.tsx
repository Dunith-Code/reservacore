import Link from "next/link";
import { MapPin, Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/current-user";
import { listResources, listResourceTypes } from "@/lib/services/resources";

export const dynamic = "force-dynamic";

const selectCls = "h-9 rounded-md border bg-background px-3 text-sm";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status === "inactive" || sp.status === "all" ? sp.status : "active";

  const [user, types, resources] = await Promise.all([
    getCurrentUser(),
    listResourceTypes(),
    listResources({ q: sp.q?.trim() || undefined, type: sp.type || undefined, status }),
  ]);
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-muted-foreground">Rooms, equipment and vehicles you can reserve</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/resources/new"><Plus className="size-4" /> Add resource</Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={sp.q} placeholder="Search by name…" className="w-56" />
        <select name="type" defaultValue={sp.type ?? ""} className={selectCls}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="status" defaultValue={status} className={selectCls}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
        <Button type="button" variant="ghost" asChild><Link href="/resources">Reset</Link></Button>
      </form>

      {resources.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No resources match your filters.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((r) => (
            <Link key={r.id} href={`/resources/${r.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{r.name}</div>
                    {!r.isActive ? (
                      <Badge variant="outline" className="border-transparent bg-slate-100 text-slate-600">Inactive</Badge>
                    ) : r.inUseNow ? (
                      <Badge variant="outline" className="border-transparent bg-amber-100 text-amber-700">In use</Badge>
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-700">Available</Badge>
                    )}
                  </div>
                  <Badge variant="secondary">{r.type}</Badge>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {r.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{r.location}</span>}
                    {r.capacity && <span className="flex items-center gap-1"><Users className="size-3.5" />{r.capacity}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}