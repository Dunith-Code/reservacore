"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { bookingFormSchema, rescheduleFormSchema } from "@/lib/validators";
import {
  cancelReservation,
  createReservation,
  rescheduleReservation,
  ConflictError,
  ForbiddenError,
  ValidationError,
  type Suggestions,
} from "@/lib/services/reservations";

export type BookingState = {
  error?: string;
  suggestions?: Suggestions;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { resourceId: string; title: string; date: string; start: string; end: string };
};

export type RescheduleState = {
  error?: string;
  suggestions?: Suggestions;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { date: string; start: string; end: string };
};

function revalidateAll() {
  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  revalidatePath("/resources");
}

export async function createReservationAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const values = {
    resourceId: String(formData.get("resourceId") ?? ""),
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
  };

  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const { resourceId, title, date, start, end } = parsed.data;
  const startTime = new Date(`${date}T${start}:00+05:30`);
  const endTime = new Date(`${date}T${end}:00+05:30`);
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()))
    return { error: "Invalid date or time", values };

  const user = await getCurrentUser();
  try {
    await createReservation({ resourceId, title, startTime, endTime }, user.id);
  } catch (e) {
    if (e instanceof ConflictError) return { error: e.message, suggestions: e.suggestions, values };
    if (e instanceof ValidationError) return { error: e.message, values };
    throw e;
  }

  revalidateAll();
  redirect("/reservations?created=1");
}

export async function rescheduleReservationAction(
  id: string,
  _prev: RescheduleState,
  formData: FormData
): Promise<RescheduleState> {
  const values = {
    date: String(formData.get("date") ?? ""),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
  };

  const parsed = rescheduleFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const { date, start, end } = parsed.data;
  const startTime = new Date(`${date}T${start}:00+05:30`);
  const endTime = new Date(`${date}T${end}:00+05:30`);
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()))
    return { error: "Invalid date or time", values };

  const user = await getCurrentUser();
  try {
    await rescheduleReservation(id, user, { startTime, endTime });
  } catch (e) {
    if (e instanceof ConflictError) return { error: e.message, suggestions: e.suggestions, values };
    if (e instanceof ValidationError || e instanceof ForbiddenError) return { error: e.message, values };
    throw e;
  }

  revalidateAll();
  redirect("/reservations?updated=1");
}

export async function cancelReservationAction(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  try {
    await cancelReservation(id, user);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof ValidationError) return { error: e.message };
    throw e;
  }
  revalidateAll();
  return {};
}