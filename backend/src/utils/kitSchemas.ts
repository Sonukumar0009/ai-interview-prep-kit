import { z } from "zod";

export const createKitSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required"),
  companyUrl: z.string().url("Company URL must be a valid URL"),
  daysAvailable: z
    .number()
    .int("Days must be a whole number")
    .min(1, "Days must be at least 1")
    .max(60, "Days cannot exceed 60"),
});

export type CreateKitInput = z.infer<typeof createKitSchema>;