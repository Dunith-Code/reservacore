"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { ForbiddenError } from "@/lib/services/reservations";
import { resourceSchema } from "@/lib/validators";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function toFailure(e: unknown): FormState {
  if (e instanceof ForbiddenError) return { error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return { fieldErrors: { name: ["A resource with this name already exists"] } };
  throw e;
}

export async function createResource(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let id: string;
  try {
    await requireAdmin();
    const { name, type, location, description, capacity } = parsed.data;
    const r = await prisma.resource.create({
      data: { name, type, location: location ?? null, description: description ?? null, capacity: capacity ?? null },
    });
    id = r.id;
  } catch (e) {
    return toFailure(e);
  }
  revalidatePath("/resources");
  redirect(`/resources/${id}`);
}

export async function updateResource(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await requireAdmin();
    const { name, type, location, description, capacity } = parsed.data;
    await prisma.resource.update({
      where: { id },
      data: { name, type, location: location ?? null, description: description ?? null, capacity: capacity ?? null },
    });
  } catch (e) {
    return toFailure(e);
  }
  revalidatePath("/resources");
  redirect(`/resources/${id}`);
}

export async function setResourceActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.resource.update({ where: { id }, data: { isActive: active } });
  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
}