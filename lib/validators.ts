import { z } from "zod";

export const createReservationSchema = z.object({
  resourceId: z.string().min(1, "Select a resource"),
  title: z.string().trim().min(3, "Purpose must be at least 3 characters").max(120),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});
export type CreateInput = z.infer<typeof createReservationSchema>;

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

export const resourceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.string().trim().min(2).max(40),
  location: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  capacity: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().max(1000).optional()),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

export const bookingFormSchema = z.object({
  resourceId: z.string().min(1, "Select a resource"),
  title: z.string().trim().min(3, "Purpose must be at least 3 characters").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time"),
});