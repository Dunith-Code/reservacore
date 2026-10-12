import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { listResourceTypes } from "@/lib/services/resources";
import { createResource } from "@/app/actions/resources";
import { ResourceForm } from "@/components/resource-form";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/resources");
  const types = await listResourceTypes();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add resource</h1>
      <ResourceForm action={createResource} types={types} cancelHref="/resources" submitLabel="Create resource" />
    </div>
  );
}