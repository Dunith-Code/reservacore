import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getResource, listResourceTypes } from "@/lib/services/resources";
import { updateResource } from "@/app/actions/resources";
import { ResourceForm } from "@/components/resource-form";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, resource, types] = await Promise.all([
    getCurrentUser(), getResource(id), listResourceTypes(),
  ]);
  if (!resource) notFound();
  if (user.role !== "ADMIN") redirect(`/resources/${id}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit {resource.name}</h1>
      <ResourceForm
        action={updateResource.bind(null, id)}
        types={types}
        cancelHref={`/resources/${id}`}
        submitLabel="Save changes"
        defaults={resource}
      />
    </div>
  );
}