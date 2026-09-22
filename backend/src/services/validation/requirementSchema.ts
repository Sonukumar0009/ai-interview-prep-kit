import { z } from "zod";

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const requirementsExtractionSchema = z.object({
  requirements: z.array(requirementSchema),
});

export type Requirement = z.infer<typeof requirementSchema>;